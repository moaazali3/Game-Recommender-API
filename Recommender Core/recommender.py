"""Inference for the persisted game-content recommender."""

from __future__ import annotations

import os
import json
import logging
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from scipy.sparse import load_npz
from sklearn.metrics.pairwise import cosine_similarity

try:
    from .logging_utils import configure_logging
except ImportError:
    from logging_utils import configure_logging

configure_logging()
logger = logging.getLogger(__name__)

try:
    from .build_model import validate_app_ids
    from .Routes import PageRequest
except ImportError:
    from build_model import validate_app_ids
    from Routes import PageRequest

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model")


class GameRecommender:
    """Load model artifacts and produce content-based game recommendations."""

    def __init__(self, model_dir: str | os.PathLike[str] = MODEL_DIR) -> None:
        """Load all artifacts required for inference and incremental transforms."""
        directory = Path(model_dir)
        artifact_directory = directory
        self.model_generation = None
        self.legacy_artifacts = True
        logger.info("component=model operation=load stage=start next_action=resolve_active_generation")

        manifest = directory / "active_manifest.json"

        if manifest.is_file():
            logger.info("component=model operation=load stage=manifest_detected")

            try:
                manifest_data = json.loads(manifest.read_text(encoding = "utf-8"))
                generation = manifest_data["generation"]

                if not isinstance(generation, str) or Path(generation).name != generation:
                    raise ValueError("Invalid active model generation.")

                artifact_directory = directory / generation
                self.model_generation = generation
                self.legacy_artifacts = False
                logger.info("component=model operation=load stage=generation_resolved generation=%s", generation)

            except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
                logger.exception("component=model operation=load stage=manifest failure=invalid_artifact next_action=repair or retrain model")
                raise ValueError(f"Invalid model manifest in {directory}.") from exc

        required = (
            "app_ids.joblib", "tag_vectorizer.joblib", "keyword_vectorizer.joblib",
            "tag_matrix.npz", "keyword_matrix.npz",
        )

        missing = [name for name in required if not (artifact_directory / name).is_file()]

        if self.legacy_artifacts:
            logger.info("component=model operation=load stage=legacy_artifacts")

        if missing:
            logger.error("component=model operation=load stage=validation failure=missing_artifact count=%d next_action=run model training", len(missing))
            raise FileNotFoundError(
                f"Incomplete recommendation model in {directory}: missing {', '.join(missing)}"
            )

        self.model_dir = directory

        try:
            loaded_app_ids = joblib.load(artifact_directory / "app_ids.joblib")

            if not isinstance(loaded_app_ids, np.ndarray) or loaded_app_ids.ndim != 1 or loaded_app_ids.dtype.kind not in "iu":
                logger.error("component=appid operation=load stage=validation failure=non_integer_artifact_dtype dtype=%s next_action=retrain model", getattr(loaded_app_ids, "dtype", type(loaded_app_ids).__name__))

                raise ValueError("Model AppID artifact must be a one-dimensional integer NumPy array; object/string artifacts are invalid.")

            self.app_ids = np.asarray(validate_app_ids(loaded_app_ids.tolist(), source = "model artifact"), dtype = np.int64)
            self.tag_vectorizer = joblib.load(artifact_directory / "tag_vectorizer.joblib")
            self.keyword_vectorizer = joblib.load(artifact_directory / "keyword_vectorizer.joblib")
            self.tag_matrix = load_npz(artifact_directory / "tag_matrix.npz").tocsr()
            self.keyword_matrix = load_npz(artifact_directory / "keyword_matrix.npz").tocsr()

        except Exception:
            logger.exception("component=model operation=load stage=read failure=corrupt_artifact next_action=replace artifacts or retrain model")
            raise

        logger.info("component=model operation=load stage=artifacts_loaded rows=%d", len(self.app_ids))

        tag_dimensions = len(getattr(self.tag_vectorizer, "vocabulary_", {}))
        keyword_dimensions = len(getattr(self.keyword_vectorizer, "vocabulary_", {}))

        if (len(self.app_ids) != self.tag_matrix.shape[0] or
                len(self.app_ids) != self.keyword_matrix.shape[0] or

                self.tag_matrix.shape[1] != tag_dimensions or
                self.keyword_matrix.shape[1] != keyword_dimensions):

            logger.error("component=model operation=load stage=validation failure=dimension_mismatch next_action=retrain model")
            raise ValueError("Model artifacts disagree about games or vectorizer dimensions.")

        if len(set(self.app_ids.tolist())) != len(self.app_ids):
            logger.error("component=model operation=load stage=validation failure=duplicate_ids next_action=retrain model")
            raise ValueError("Model artifacts contain duplicate AppIDs.")

        logger.info("component=model operation=load stage=validation_complete rows=%d tag_dimensions=%d keyword_dimensions=%d", len(self.app_ids), self.tag_matrix.shape[1], self.keyword_matrix.shape[1])
        self.id_to_index = {int(app_id): idx for idx, app_id in enumerate(self.app_ids)}
        logger.info("component=model operation=load stage=complete rows=%d next_action=serve_inference", len(self.app_ids))

    def get_recommendations_widget(self, request: PageRequest) -> dict[str, Any]:
        """Return ranked recommendations for the requested ``app_id``.

        Scores remain ``sqrt(tag cosine * keyword cosine)`` and are presented as
        percentages rounded to two decimals. For compatibility with the original
        implementation, the target score is zero, the first ``top_n`` stable
        row positions are selected, and zero-score rows are then filtered.
        Equal scores use row index as the deterministic tie-break.
        """
        app_id = request.app_id if request.app_id is not None else request.filters.get("app_id")
        requested_top_n = request.top_n

        top_n = 10 if requested_top_n is None else requested_top_n

        if not isinstance(top_n, int) or isinstance(top_n, bool) or top_n <= 0:
            logger.warning("component=inference operation=recommend stage=validation failure=invalid_top_n next_action=return validation error")
            return {"error": "top_n must be a positive integer."}

        if app_id is None or app_id not in self.id_to_index:
            logger.warning("component=inference operation=recommend stage=validation failure=unknown_app_id next_action=return not_found error")
            return {"error": f"AppID '{app_id}' not found or not provided."}

        if not self.app_ids.size:
            logger.info("component=inference operation=recommend stage=complete rows=0 next_action=return empty result")
            return {"total": 0, "games": []}

        target_idx = self.id_to_index[app_id]
        logger.debug("component=inference operation=recommend stage=context requested_app_id=%s target_index=%d game_count=%d top_n=%d generation=%s legacy=%s tag_matrix_dimensions=%s keyword_matrix_dimensions=%s", app_id, target_idx, len(self.app_ids), top_n, self.model_generation or "legacy", self.legacy_artifacts, self.tag_matrix.shape, self.keyword_matrix.shape)
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

        logger.debug("component=inference operation=recommend stage=complete final_count=%d", len(games))
        return {"total": len(games), "games": games}
