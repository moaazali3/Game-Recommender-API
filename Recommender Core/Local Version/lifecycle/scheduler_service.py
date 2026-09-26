"""Training orchestration and safe local publication."""
from __future__ import annotations

import threading
from pathlib import Path

from sqlalchemy import create_engine

from ml.model import build_artifacts, load_games, validate_app_ids, validate_generation, write_generation


class LocalScheduler:
    def __init__(self, storage, database_url: str, storage_dir: str | Path, model_holder = None):
        self.storage = storage
        self.database_url = database_url
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents = True, exist_ok = True)
        self.lock = threading.RLock()
        self.model_holder = model_holder

    def _publish(self, data):
        generation = write_generation(build_artifacts(data), self.storage_dir)
        local = self.storage_dir / generation
        validate_generation(local)
        self.storage.publish(local, generation)
        if self.model_holder is not None:
            from ml.recommender import GameRecommender
            self.model_holder.current = GameRecommender(self.storage_dir, generation)
        self.storage.cleanup(generation, keep = 5)
        return generation

    def _run_monthly(self):
        engine = create_engine(self.database_url, pool_pre_ping = True)
        return self._publish(load_games(engine))

    def run_monthly(self):
        with self.lock:
            return self._run_monthly()

    def run_weekly(self):
        with self.lock:
            try:
                active = self.storage.active_generation()
                import joblib
                old_ids = validate_app_ids(
                    joblib.load(self.storage_dir / active / "app_ids.joblib").tolist(),
                    "model artifact",
                )
                engine = create_engine(self.database_url, pool_pre_ping = True)
                data = load_games(engine)
                new_ids = validate_app_ids(data["Appid"].tolist(), "database", True)
                if old_ids != new_ids[:len(old_ids)]:
                    return self._run_monthly()
                return self._publish(data)
            except Exception:
                return self._run_monthly()
