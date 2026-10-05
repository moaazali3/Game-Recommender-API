"""Production multi-game Game Blender."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

from .artifacts import ArtifactBundle, load_bundle


DEFAULT_TOP_K = 10
DEFAULT_STAGE2_MULTIPLIER = 3
P75_DEFINITION = "p75_relative_gap"


@dataclass(frozen = True)
class Group:
    index: int
    start: int
    end: int


class GameBlender:
    """Blend 2-4 selected games using the established vectorizer semantics."""

    def __init__(self, bundle: ArtifactBundle):
        self.bundle = bundle
        self._id_to_row = {int(app_id): index for index, app_id in enumerate(bundle.app_ids)}
        catalog = bundle.catalog.set_index("Appid", drop = False)
        self._catalog_by_id = catalog

    @classmethod
    def from_artifacts(cls, model_dir: str, catalog_path: str | None = None) -> "GameBlender":
        return cls(load_bundle(model_dir, catalog_path))

    @staticmethod
    def _positive_int(value: Any, name: str) -> int:
        if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
            raise ValueError(f"{name} must be a positive integer")
        return value

    @staticmethod
    def _feature_list(value: Any) -> list[str]:
        seen: set[str] = set()
        features: list[str] = []
        for item in str(value).split(","):
            display = item.strip()
            folded = display.casefold()
            if display and folded not in seen:
                seen.add(folded)
                features.append(display)
        return features

    @classmethod
    def _mix_text(cls, rows: pd.DataFrame, column: str) -> str:
        seen: set[str] = set()
        features: list[str] = []
        for value in rows[column]:
            for feature in cls._feature_list(value):
                folded = feature.casefold()
                if folded not in seen:
                    seen.add(folded)
                    features.append(feature)
        return " ".join(features)

    def _selected_rows(self, selected_app_ids: Iterable[int]) -> tuple[list[int], pd.DataFrame]:
        selected = list(selected_app_ids)
        if not 2 <= len(selected) <= 4:
            raise ValueError("selected_app_ids must contain between 2 and 4 games")
        if any(isinstance(value, bool) or not isinstance(value, int) for value in selected):
            raise ValueError("selected_app_ids must contain integer AppIDs")
        if len(set(selected)) != len(selected):
            raise ValueError("selected_app_ids must be distinct")
        missing = [app_id for app_id in selected if app_id not in self._id_to_row]
        if missing:
            raise ValueError(f"Unknown AppIDs: {missing}")
        rows = self._catalog_by_id.loc[selected].reset_index(drop = True)
        return [self._id_to_row[app_id] for app_id in selected], rows

    def _mix_scores(self, selected_rows: pd.DataFrame, candidate_rows: list[int]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        tag_vector = self.bundle.tag_vectorizer.transform([self._mix_text(selected_rows, "Tags")])
        keyword_vector = self.bundle.keyword_vectorizer.transform([self._mix_text(selected_rows, "keywords")])
        tag_scores = cosine_similarity(self.bundle.tag_matrix[candidate_rows], tag_vector).ravel()
        keyword_scores = cosine_similarity(self.bundle.keyword_matrix[candidate_rows], keyword_vector).ravel()
        mix_scores = self._combine_scores(tag_scores, keyword_scores)
        return tag_scores, keyword_scores, mix_scores

    @staticmethod
    def _combine_scores(tag_scores: np.ndarray, keyword_scores: np.ndarray) -> np.ndarray:
        return np.sqrt(np.clip(tag_scores * keyword_scores, 0.0, None))

    def _old_scores(self, selected_row_index: int, candidate_rows: list[int]) -> np.ndarray:
        tag_scores = cosine_similarity(
            self.bundle.tag_matrix[selected_row_index],
            self.bundle.tag_matrix[candidate_rows],
        ).ravel()
        keyword_scores = cosine_similarity(
            self.bundle.keyword_matrix[selected_row_index],
            self.bundle.keyword_matrix[candidate_rows],
        ).ravel()
        return self._combine_scores(tag_scores, keyword_scores)

    def _exclusive_tags(self, selected_rows: pd.DataFrame) -> dict[int, set[str]]:
        by_tag: dict[str, set[int]] = {}
        for app_id, tags in zip(selected_rows["Appid"], selected_rows["Tags"]):
            for tag in self._feature_list(tags):
                by_tag.setdefault(tag.casefold(), set()).add(int(app_id))
        exclusive = {int(app_id): set() for app_id in selected_rows["Appid"]}
        for tag, owners in by_tag.items():
            if len(owners) == 1:
                exclusive[next(iter(owners))].add(tag)
        return exclusive

    def _coverage_counts(self, selected_rows: pd.DataFrame, candidate_ids: list[int]) -> np.ndarray:
        exclusive = self._exclusive_tags(selected_rows)
        counts = []
        for app_id in candidate_ids:
            tags = {tag.casefold() for tag in self._feature_list(self._catalog_by_id.loc[app_id, "Tags"])}
            counts.append(sum(bool(tags & exclusive[selected_id]) for selected_id in exclusive))
        return np.asarray(counts, dtype = np.int64)

    @staticmethod
    def adjacent_relative_gaps(scores: Iterable[float]) -> np.ndarray:
        values = np.asarray(list(scores), dtype = float)
        if values.size < 2:
            return np.zeros(0, dtype = float)
        gaps = np.zeros(values.size - 1, dtype = float)
        denominators = values[:-1]
        usable = denominators != 0
        gaps[usable] = (values[:-1][usable] - values[1:][usable]) / denominators[usable]
        return gaps

    @classmethod
    def derive_p75_relative_gap(cls, scores: Iterable[float], definition: str = P75_DEFINITION) -> float | None:
        if definition != P75_DEFINITION:
            raise ValueError(f"unsupported gap definition: {definition!r}")
        gaps = cls.adjacent_relative_gaps(scores)
        if gaps.size == 0:
            return None
        return float(np.percentile(gaps, 75))

    @classmethod
    def group_stage2(cls, scores: Iterable[float], definition: str = P75_DEFINITION) -> tuple[list[Group], float | None, np.ndarray]:
        values = np.asarray(list(scores), dtype = float)
        gaps = cls.adjacent_relative_gaps(values)
        tau = cls.derive_p75_relative_gap(values, definition)
        if values.size == 0:
            return [], tau, gaps
        starts = [0]
        if tau is not None:
            starts.extend(index + 1 for index, gap in enumerate(gaps) if gap > tau)
        groups = [
            Group(index = index + 1, start = start, end = (starts[index + 1] - 1 if index + 1 < len(starts) else len(values) - 1))
            for index, start in enumerate(starts)
        ]
        return groups, tau, gaps

    @staticmethod
    def _reorder_stage2(rows: list[dict[str, Any]], groups: list[Group]) -> list[dict[str, Any]]:
        reordered: list[dict[str, Any]] = []
        for group in groups:
            block = rows[group.start:group.end + 1]
            block = sorted(block, key = lambda row: -int(row["coverage_count"]))
            reordered.extend(block)
        return reordered

    def recommend(
        self,
        selected_app_ids: Iterable[int],
        top_k: int = DEFAULT_TOP_K,
        stage2_multiplier: int = DEFAULT_STAGE2_MULTIPLIER,
    ) -> dict[str, Any]:
        top_k = self._positive_int(top_k, "top_k")
        stage2_multiplier = self._positive_int(stage2_multiplier, "stage2_multiplier")
        selected_rows_index, selected_rows = self._selected_rows(selected_app_ids)
        selected_set = set(selected_rows_index)
        candidate_rows = [index for index in range(len(self.bundle.app_ids)) if index not in selected_set]
        old_scores = self._old_scores(selected_rows_index[0], candidate_rows)
        candidate_rows = [
            row_index
            for row_index, old_score in zip(candidate_rows, old_scores)
            if old_score > 0.0
        ]
        if not candidate_rows:
            return {
                "selected_app_ids": [int(app_id) for app_id in selected_rows["Appid"]],
                "top_k": top_k,
                "stage2_multiplier": stage2_multiplier,
                "stage2_size": 0,
                "p75_relative_gap": None,
                "relative_gaps": [],
                "groups": [],
                "candidates": [],
                "stage2": [],
                "recommendations": [],
            }
        tag_scores, keyword_scores, mix_scores = self._mix_scores(selected_rows, candidate_rows)
        candidates: list[dict[str, Any]] = []
        coverage_counts = self._coverage_counts(selected_rows, [int(self.bundle.app_ids[index]) for index in candidate_rows])
        for position, row_index in enumerate(candidate_rows):
            score = float(mix_scores[position])
            if score <= 0.0:
                continue
            app_id = int(self.bundle.app_ids[row_index])
            row = self._catalog_by_id.loc[app_id]
            candidates.append({
                "app_id": app_id,
                "name": str(row["Name"]),
                "tag_similarity": float(tag_scores[position]),
                "keyword_similarity": float(keyword_scores[position]),
                "mix_score": score,
                "coverage_count": int(coverage_counts[position]),
            })
        candidates.sort(key = lambda row: -row["mix_score"])
        for rank, row in enumerate(candidates, start = 1):
            row["stage1_rank"] = rank

        stage2_size = min(top_k * stage2_multiplier, len(candidates))
        stage2 = candidates[:stage2_size]
        groups, tau, gaps = self.group_stage2([row["mix_score"] for row in stage2])
        reordered = self._reorder_stage2(stage2, groups)
        for rank, row in enumerate(reordered, start = 1):
            row["stage2_rank"] = next(index + 1 for index, item in enumerate(stage2) if item["app_id"] == row["app_id"])
            row["group_index"] = next(group.index for group in groups if group.start <= rank - 1 <= group.end)
            row["final_rank"] = rank
        final = reordered[:top_k]
        return {
            "selected_app_ids": [int(app_id) for app_id in selected_rows["Appid"]],
            "top_k": top_k,
            "stage2_multiplier": stage2_multiplier,
            "stage2_size": stage2_size,
            "p75_relative_gap": tau,
            "relative_gaps": gaps.tolist(),
            "groups": [{"index": group.index, "start": group.start, "end": group.end} for group in groups],
            "candidates": candidates,
            "stage2": stage2,
            "recommendations": final,
        }
