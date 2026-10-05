"""Local artifact storage adapter."""
from __future__ import annotations

from pathlib import Path

from ml.artifacts import ArtifactBundle, load_bundle


class LocalStorage:
    def __init__(self, model_dir: str | Path):
        self.model_dir = Path(model_dir)

    def load(self, catalog_path: str | Path | None = None) -> ArtifactBundle:
        return load_bundle(self.model_dir, catalog_path)
