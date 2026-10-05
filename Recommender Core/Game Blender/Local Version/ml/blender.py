"""HTTP-only post-processing for Game Recommender results."""
from __future__ import annotations

import json
import math
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Callable, Iterable


DEFAULT_TOP_K = 10
DEFAULT_STAGE2_MULTIPLIER = 3
P75_DEFINITION = "p75_relative_gap"


@dataclass(frozen = True)
class Group:
    index: int
    start: int
    end: int


class GameRecommenderClient:
    """Small stdlib HTTP client for the Game Recommender mix endpoint."""

    def __init__(
        self,
        base_url: str,
        token: str | None = None,
        opener: Callable[..., Any] | None = None,
        timeout: float = 10.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.opener = opener or urllib.request.urlopen
        self.timeout = timeout

    def recommend(self, selected_app_ids: list[int], top_k: int, include_tags: bool) -> dict[str, Any]:
        payload = json.dumps({
            "selected_app_ids": selected_app_ids,
            "top_k": top_k,
            "include_tags": include_tags,
        }).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        request = urllib.request.Request(
            f"{self.base_url}/api/v1/mix-recommendations",
            data = payload,
            headers = headers,
            method = "POST",
        )
        try:
            response = self.opener(request, timeout = self.timeout)
            status = getattr(response, "status", 200)
            body = response.read()
        except (urllib.error.URLError, OSError, TimeoutError) as exc:
            raise RuntimeError(f"Game Recommender request failed: {exc}") from exc
        if status < 200 or status >= 300:
            raise RuntimeError(f"Game Recommender returned HTTP {status}")
        try:
            document = json.loads(body.decode("utf-8") if isinstance(body, bytes) else body)
        except (TypeError, ValueError) as exc:
            raise RuntimeError("Game Recommender returned invalid JSON") from exc
        if not isinstance(document, dict) or document.get("status") != "success":
            message = document.get("error", "unknown error") if isinstance(document, dict) else "invalid response"
            raise RuntimeError(f"Game Recommender returned an error: {message}")
        data = document.get("data")
        if not isinstance(data, dict):
            raise RuntimeError("Game Recommender response is missing data")
        return data


class GameBlender:
    """Apply runtime grouping and coverage ordering to source candidates."""

    def __init__(self, recommender_client: GameRecommenderClient | Callable[..., dict[str, Any]]):
        self.recommender_client = recommender_client

    @staticmethod
    def _positive_int(value: Any, name: str) -> int:
        if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
            raise ValueError(f"{name} must be a positive integer")
        return value

    @staticmethod
    def _validate_selected(selected_app_ids: Iterable[int]) -> list[int]:
        selected = list(selected_app_ids)
        if not 2 <= len(selected) <= 4:
            raise ValueError("selected_app_ids must contain between 2 and 4 games")
        if any(isinstance(value, bool) or not isinstance(value, int) for value in selected):
            raise ValueError("selected_app_ids must contain integer AppIDs")
        if len(set(selected)) != len(selected):
            raise ValueError("selected_app_ids must be distinct")
        return selected

    @staticmethod
    def _feature_list(value: Any) -> list[str]:
        values = value if isinstance(value, (list, tuple, set)) else str(value).split(",")
        seen: set[str] = set()
        features: list[str] = []
        for item in values:
            display = str(item).strip()
            folded = display.casefold()
            if display and folded not in seen:
                seen.add(folded)
                features.append(display)
        return features

    @classmethod
    def _exclusive_tags(cls, selected_games: list[dict[str, Any]]) -> dict[int, set[str]]:
        by_tag: dict[str, set[int]] = {}
        for game in selected_games:
            app_id = int(game["app_id"])
            for tag in cls._feature_list(game["Tags"]):
                by_tag.setdefault(tag.casefold(), set()).add(app_id)
        exclusive = {int(game["app_id"]): set() for game in selected_games}
        for tag, owners in by_tag.items():
            if len(owners) == 1:
                exclusive[next(iter(owners))].add(tag)
        return exclusive

    @classmethod
    def _coverage_count(cls, candidate: dict[str, Any], exclusive: dict[int, set[str]]) -> int:
        candidate_tags = {tag.casefold() for tag in cls._feature_list(candidate["Tags"])}
        return sum(bool(candidate_tags & tags) for tags in exclusive.values())

    @staticmethod
    def adjacent_relative_gaps(scores: Iterable[float]) -> list[float]:
        values = [float(score) for score in scores]
        return [
            (previous - current) / previous if previous != 0 else 0.0
            for previous, current in zip(values, values[1:])
        ]

    @classmethod
    def derive_p75_relative_gap(cls, scores: Iterable[float], definition: str = P75_DEFINITION) -> float | None:
        if definition != P75_DEFINITION:
            raise ValueError(f"unsupported gap definition: {definition!r}")
        gaps = cls.adjacent_relative_gaps(scores)
        if not gaps:
            return None
        ordered_gaps = sorted(gaps)
        position = (len(ordered_gaps) - 1) * 0.75
        lower = math.floor(position)
        upper = math.ceil(position)
        if lower == upper:
            return float(ordered_gaps[lower])
        weight = position - lower
        return float(ordered_gaps[lower] + (ordered_gaps[upper] - ordered_gaps[lower]) * weight)

    @classmethod
    def group_candidates(
        cls,
        scores: Iterable[float],
        definition: str = P75_DEFINITION,
    ) -> tuple[list[Group], float | None, list[float]]:
        values = [float(score) for score in scores]
        gaps = cls.adjacent_relative_gaps(values)
        tau = cls.derive_p75_relative_gap(values, definition)
        if not values:
            return [], tau, gaps
        starts = [0]
        if tau is not None:
            starts.extend(index + 1 for index, gap in enumerate(gaps) if gap > tau)
        groups = [
            Group(
                index = index + 1,
                start = start,
                end = starts[index + 1] - 1 if index + 1 < len(starts) else len(values) - 1,
            )
            for index, start in enumerate(starts)
        ]
        return groups, tau, gaps

    @staticmethod
    def _reorder_within_groups(candidates: list[dict[str, Any]], groups: list[Group]) -> list[dict[str, Any]]:
        reordered: list[dict[str, Any]] = []
        for group in groups:
            block = candidates[group.start:group.end + 1]
            reordered.extend(sorted(block, key = lambda candidate: -int(candidate["coverage_count"])))
        return reordered

    @staticmethod
    def _validate_response(data: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        candidates = data.get("games")
        selected_games = data.get("selected_games")
        if not isinstance(candidates, list) or not isinstance(selected_games, list):
            raise RuntimeError("Game Recommender response must contain games and selected_games")
        for game in candidates + selected_games:
            if not isinstance(game, dict) or isinstance(game.get("app_id"), bool) or not isinstance(game.get("app_id"), int):
                raise RuntimeError("Game Recommender response contains an invalid AppID")
            if "Tags" not in game:
                raise RuntimeError("Game Recommender response is missing Tags")
        for game in candidates:
            score = game.get("similarity_score")
            if isinstance(score, bool) or not isinstance(score, (int, float)) or not math.isfinite(float(score)):
                raise RuntimeError("Game Recommender response contains an invalid similarity score")
        return candidates, selected_games

    def recommend(
        self,
        selected_app_ids: Iterable[int],
        top_k: int = DEFAULT_TOP_K,
        stage2_multiplier: int = DEFAULT_STAGE2_MULTIPLIER,
    ) -> list[int]:
        selected = self._validate_selected(selected_app_ids)
        top_k = self._positive_int(top_k, "top_k")
        stage2_multiplier = self._positive_int(stage2_multiplier, "stage2_multiplier")
        request_top_k = top_k * stage2_multiplier
        if hasattr(self.recommender_client, "recommend"):
            data = self.recommender_client.recommend(
                selected_app_ids = selected,
                top_k = request_top_k,
                include_tags = True,
            )
        else:
            data = self.recommender_client(
                selected_app_ids = selected,
                top_k = request_top_k,
                include_tags = True,
            )
        candidates, selected_games = self._validate_response(data)
        exclusive = self._exclusive_tags(selected_games)
        working_pool = [dict(candidate, coverage_count = self._coverage_count(candidate, exclusive)) for candidate in candidates]
        groups, _, _ = self.group_candidates(candidate["similarity_score"] for candidate in working_pool)
        reordered = self._reorder_within_groups(working_pool, groups)
        return [int(candidate["app_id"]) for candidate in reordered[:top_k]]