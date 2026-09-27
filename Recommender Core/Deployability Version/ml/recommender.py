"""Inference for the persisted content recommender."""
from __future__ import annotations
from pathlib import Path
from typing import Any
import joblib, numpy as np
from scipy.sparse import load_npz
from sklearn.metrics.pairwise import cosine_similarity
from .model import validate_generation, _GEN

class GameRecommender:
    def __init__(self, model_dir: str | Path, generation: str | None = None):
        root = Path(model_dir); manifest = root / "active_manifest.json"
        if generation is None:
            if not manifest.is_file(): raise FileNotFoundError("No active model manifest")
            import json
            generation = json.loads(manifest.read_text(encoding = "utf-8")).get("generation")
        if not isinstance(generation, str) or not _GEN.fullmatch(generation): raise ValueError("Invalid active generation")
        self.generation = generation; self.path = root / generation; validate_generation(self.path)
        self.app_ids = joblib.load(self.path / "app_ids.joblib")
        self.tag_vectorizer = joblib.load(self.path / "tag_vectorizer.joblib"); self.keyword_vectorizer = joblib.load(self.path / "keyword_vectorizer.joblib")
        self.tag_matrix = load_npz(self.path / "tag_matrix.npz").tocsr(); self.keyword_matrix = load_npz(self.path / "keyword_matrix.npz").tocsr()
        self.id_to_index = {int(v): i for i, v in enumerate(self.app_ids)}

    def recommend(self, app_id: int | None, top_n: int = 10) -> dict[str, Any]:
        if not isinstance(top_n, int) or isinstance(top_n, bool) or top_n <= 0: return {"error": "top_n must be a positive integer."}
        if app_id is None or app_id not in self.id_to_index: return {"error": f"AppID '{app_id}' not found or not provided."}
        i = self.id_to_index[app_id]
        scores = np.sqrt(np.clip(cosine_similarity(self.tag_matrix[i], self.tag_matrix).ravel() * cosine_similarity(self.keyword_matrix[i], self.keyword_matrix).ravel(), 0, None)); scores[i] = 0
        indices = np.argsort(-scores, kind = "stable")[:min(top_n, len(scores))]
        games = [{"app_id": int(self.app_ids[j]), "similarity_score": round(float(scores[j]) * 100, 2)} for j in indices if scores[j] > 0]
        return {"total": len(games), "games": games}

    def get_recommendations_widget(self, request) -> dict[str, Any]:
        app_id = request.app_id if request.app_id is not None else request.filters.get("app_id")
        return self.recommend(app_id, 10 if request.top_n is None else request.top_n)
