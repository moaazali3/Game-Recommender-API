"""Inference for the persisted content recommender."""
from __future__ import annotations

from pathlib import Path
from typing import Any, Iterable

import joblib
import numpy as np
from scipy.sparse import load_npz
from sklearn.metrics.pairwise import cosine_similarity

from .model import RAW_KEYWORDS_FILE, RAW_TAGS_FILE, _GEN, validate_generation


class GameRecommender:
    def __init__(self, model_dir: str | Path, generation: str | None = None):
        root = Path(model_dir)
        manifest = root / "active_manifest.json"
        if generation is None:
            if not manifest.is_file():
                raise FileNotFoundError("No active model manifest")
            import json
            generation = json.loads(manifest.read_text(encoding = "utf-8")).get("generation")
        if not isinstance(generation, str) or not _GEN.fullmatch(generation):
            raise ValueError("Invalid active generation")
        self.generation = generation
        self.path = root / generation
        validate_generation(self.path)
        self.app_ids = joblib.load(self.path / "app_ids.joblib")
        self.tag_vectorizer = joblib.load(self.path / "tag_vectorizer.joblib")
        self.keyword_vectorizer = joblib.load(self.path / "keyword_vectorizer.joblib")
        self.tag_matrix = load_npz(self.path / "tag_matrix.npz").tocsr()
        self.keyword_matrix = load_npz(self.path / "keyword_matrix.npz").tocsr()
        self.id_to_index = {int(value): index for index, value in enumerate(self.app_ids)}
        self.raw_tags = self._load_optional_metadata(RAW_TAGS_FILE)
        self.raw_keywords = self._load_optional_metadata(RAW_KEYWORDS_FILE)

    def _load_optional_metadata(self, file_name: str) -> list[str] | None:
        path = self.path / file_name
        if path.is_file():
            return [str(value) for value in joblib.load(path)]
        vectorizer = self.tag_vectorizer if file_name == RAW_TAGS_FILE else self.keyword_vectorizer
        values = getattr(vectorizer, "raw_tags_", None) if file_name == RAW_TAGS_FILE else getattr(vectorizer, "raw_keywords_", None)
        return None if values is None else [str(value) for value in values]

    @staticmethod
    def _positive_int(value: Any, name: str) -> int:
        if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
            raise ValueError(f"{name} must be a positive integer.")
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
    def _mix_text(cls, values: Iterable[Any]) -> str:
        seen: set[str] = set()
        features: list[str] = []
        for value in values:
            for feature in cls._feature_list(value):
                folded = feature.casefold()
                if folded not in seen:
                    seen.add(folded)
                    features.append(feature)
        return " ".join(features)

    @staticmethod
    def _combine_scores(tag_scores: np.ndarray, keyword_scores: np.ndarray) -> np.ndarray:
        return np.sqrt(np.clip(tag_scores * keyword_scores, 0.0, None))

    def _scores_from_rows(self, query_row: int, candidate_rows: list[int]) -> np.ndarray:
        tag_scores = cosine_similarity(self.tag_matrix[query_row], self.tag_matrix[candidate_rows]).ravel()
        keyword_scores = cosine_similarity(self.keyword_matrix[query_row], self.keyword_matrix[candidate_rows]).ravel()
        return self._combine_scores(tag_scores, keyword_scores)

    def recommend(self, app_id: int | None, top_n: int = 10) -> dict[str, Any]:
        if not isinstance(top_n, int) or isinstance(top_n, bool) or top_n <= 0:
            return {"error": "top_n must be a positive integer."}
        if app_id is None or app_id not in self.id_to_index:
            return {"error": f"AppID '{app_id}' not found or not provided."}
        i = self.id_to_index[app_id]
        scores = self._scores_from_rows(i, list(range(len(self.app_ids))))
        scores[i] = 0
        indices = np.argsort(-scores, kind = "stable")[:min(top_n, len(scores))]
        games = [
            {"app_id": int(self.app_ids[j]), "similarity_score": round(float(scores[j]) * 100, 2)}
            for j in indices
            if scores[j] > 0
        ]
        return {"total": len(games), "games": games}

    def recommend_mix(
        self,
        selected_app_ids: Iterable[int],
        top_k: int = 10,
        include_tags: bool = False,
    ) -> dict[str, Any]:
        top_k = self._positive_int(top_k, "top_k")
        selected = list(selected_app_ids)
        if not 2 <= len(selected) <= 4:
            raise ValueError("selected_app_ids must contain between 2 and 4 games.")
        if any(not isinstance(value, int) or isinstance(value, bool) for value in selected):
            raise ValueError("selected_app_ids must contain integer AppIDs.")
        if len(set(selected)) != len(selected):
            raise ValueError("selected_app_ids must be distinct.")
        missing = [value for value in selected if value not in self.id_to_index]
        if missing:
            raise ValueError(f"Unknown AppIDs: {missing}")
        if self.raw_tags is None or self.raw_keywords is None:
            raise RuntimeError("Raw tag and keyword metadata is unavailable.")

        selected_rows = [self.id_to_index[value] for value in selected]
        candidate_rows = [index for index in range(len(self.app_ids)) if index not in set(selected_rows)]
        old_scores = self._scores_from_rows(selected_rows[0], candidate_rows)
        candidate_rows = [
            row_index
            for row_index, old_score in zip(candidate_rows, old_scores)
            if old_score > 0.0
        ]
        if not candidate_rows:
            result: dict[str, Any] = {"total": 0, "games": []}
            if include_tags:
                result["selected_games"] = [
                    {"app_id": app_id, "Tags": self.raw_tags[row_index]}
                    for app_id, row_index in zip(selected, selected_rows)
                ]
            return result
        selected_tags = [self.raw_tags[index] for index in selected_rows]
        selected_keywords = [self.raw_keywords[index] for index in selected_rows]
        tag_query = self.tag_vectorizer.transform([self._mix_text(selected_tags)])
        keyword_query = self.keyword_vectorizer.transform([self._mix_text(selected_keywords)])
        tag_scores = cosine_similarity(self.tag_matrix[candidate_rows], tag_query).ravel()
        keyword_scores = cosine_similarity(self.keyword_matrix[candidate_rows], keyword_query).ravel()
        scores = self._combine_scores(tag_scores, keyword_scores)
        ranked = [
            (row_index, float(score))
            for row_index, score in zip(candidate_rows, scores)
            if score > 0.0
        ]
        ranked.sort(key = lambda item: -item[1])
        ranked = ranked[:min(top_k, len(ranked))]
        games = []
        for row_index, score in ranked:
            game = {"app_id": int(self.app_ids[row_index]), "similarity_score": score, "mix_score": score}
            if include_tags:
                game["Tags"] = self.raw_tags[row_index]
            games.append(game)
        result: dict[str, Any] = {"total": len(games), "games": games}
        if include_tags:
            result["selected_games"] = [
                {"app_id": app_id, "Tags": self.raw_tags[row_index]}
                for app_id, row_index in zip(selected, selected_rows)
            ]
        return result

    def get_recommendations_widget(self, request) -> dict[str, Any]:
        app_id = request.app_id if request.app_id is not None else request.filters.get("app_id")
        return self.recommend(app_id, 10 if request.top_n is None else request.top_n)
