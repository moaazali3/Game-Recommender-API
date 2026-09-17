"""Inference for the persisted game-content recommender."""

from __future__ import annotations

import os
import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from scipy.sparse import load_npz
from sklearn.metrics.pairwise import cosine_similarity

try:
    from .Routes import PageRequest

except ImportError:
    from Routes import PageRequest

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model")


class GameRecommender:
    """Load model artifacts and produce content-based game recommendations."""

    def __init__(self, model_dir: str | os.PathLike[str] = MODEL_DIR) -> None:
        """Load all artifacts required for inference and incremental transforms."""
        directory = Path(model_dir)
        artifact_directory = directory

        manifest = directory / "active_manifest.json"

        if manifest.is_file():
            try:
                manifest_data = json.loads(manifest.read_text(encoding = "utf-8"))
                generation = manifest_data["generation"]

                if not isinstance(generation, str) or Path(generation).name != generation:
                    raise ValueError("Invalid active model generation.")

                artifact_directory = directory / generation

            except (OSError, json.JSONDecodeError, KeyError, TypeError) as exc:
                raise ValueError(f"Invalid model manifest in {directory}.") from exc

        required = (
            "app_ids.joblib", "tag_vectorizer.joblib", "keyword_vectorizer.joblib",
            "tag_matrix.npz", "keyword_matrix.npz",
        )

        missing = [name for name in required if not (artifact_directory / name).is_file()]

        if missing:
            raise FileNotFoundError(
                f"Incomplete recommendation model in {directory}: missing {', '.join(missing)}"
            )

        self.model_dir = directory
        self.app_ids = np.asarray(joblib.load(artifact_directory / "app_ids.joblib"))
        self.tag_vectorizer = joblib.load(artifact_directory / "tag_vectorizer.joblib")
        self.keyword_vectorizer = joblib.load(artifact_directory / "keyword_vectorizer.joblib")
        self.tag_matrix = load_npz(artifact_directory / "tag_matrix.npz").tocsr()
        self.keyword_matrix = load_npz(artifact_directory / "keyword_matrix.npz").tocsr()

        tag_dimensions = len(getattr(self.tag_vectorizer, "vocabulary_", {}))
        keyword_dimensions = len(getattr(self.keyword_vectorizer, "vocabulary_", {}))

        if (len(self.app_ids) != self.tag_matrix.shape[0] or
                len(self.app_ids) != self.keyword_matrix.shape[0] or

                self.tag_matrix.shape[1] != tag_dimensions or
                self.keyword_matrix.shape[1] != keyword_dimensions):

            raise ValueError("Model artifacts disagree about games or vectorizer dimensions.")

        if len(set(self.app_ids.tolist())) != len(self.app_ids):
            raise ValueError("Model artifacts contain duplicate AppIDs.")

        self.id_to_index = {app_id: idx for idx, app_id in enumerate(self.app_ids)}

    def get_recommendations_widget(self, request: PageRequest) -> dict[str, Any]:
        """Return ranked recommendations for the requested ``app_id``.

        Scores remain ``sqrt(tag cosine * keyword cosine)`` and are presented as
        percentages rounded to two decimals. For compatibility with the original
        implementation, the target score is zero, the first ``top_n`` stable
        row positions are selected, and zero-score rows are then filtered.
        Equal scores use row index as the deterministic tie-break.
        """
        app_id = request.filters.get("app_id")
        requested_top_n = request.top_n

        top_n = 10 if requested_top_n is None else requested_top_n

        if not isinstance(top_n, int) or isinstance(top_n, bool) or top_n <= 0:
            return {"error": "top_n must be a positive integer."}

        if app_id is None or app_id not in self.id_to_index:
            return {"error": f"AppID '{app_id}' not found or not provided."}

        if not self.app_ids.size:
            return {"total": 0, "games": []}

        target_idx = self.id_to_index[app_id]
        tag_sim = cosine_similarity(self.tag_matrix[target_idx], self.tag_matrix).ravel()

        keyword_sim = cosine_similarity(
            self.keyword_matrix[target_idx], self.keyword_matrix
        ).ravel()

        scores = np.sqrt(np.clip(tag_sim * keyword_sim, a_min = 0.0, a_max = None))
        scores[target_idx] = 0.0

        candidate_count = min(top_n, len(scores))
        top_indices = np.argsort(-scores, kind = "stable")[:candidate_count]

        games = [
            {"app_id": int(self.app_ids[idx]), "similarity_score": round(float(scores[idx]) * 100, 2)}
            for idx in top_indices
            if scores[idx] > 0
        ]

        return {"total": len(games), "games": games}
