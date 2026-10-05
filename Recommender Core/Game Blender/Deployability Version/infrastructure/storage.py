"""Hugging Face-oriented storage with lazy network access."""
from __future__ import annotations

from pathlib import Path

from ml.artifacts import ArtifactBundle, load_bundle


class HubStorage:
    """Resolve a local cache or explicitly download a Hub snapshot.

    No network call, credential lookup, or Hub import happens in the constructor.
    """

    def __init__(self, repo_id: str | None, token: str | None = None, repo_type: str = "model", cache_dir: str | Path = ".model-cache"):
        self.repo_id = repo_id
        self.token = token
        self.repo_type = repo_type
        self.cache_dir = Path(cache_dir)

    def load(self, catalog_path: str | Path | None = None) -> ArtifactBundle:
        model_dir = self.cache_dir
        if self.repo_id:
            from huggingface_hub import snapshot_download

            model_dir = Path(snapshot_download(
                repo_id = self.repo_id,
                repo_type = self.repo_type,
                token = self.token,
                local_dir = str(self.cache_dir),
            ))
        return load_bundle(model_dir, catalog_path)
