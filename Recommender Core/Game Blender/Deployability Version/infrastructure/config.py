"""Credential-free import configuration for the deployability Blender."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


VERSION_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen = True)
class Settings:
    hf_repo_id: str | None
    hf_token: str | None
    hf_repo_type: str
    model_cache_dir: Path
    catalog_path: Path | None
    top_k: int
    stage2_multiplier: int

    @classmethod
    def from_env(cls) -> "Settings":
        def positive(name: str, default: str) -> int:
            try:
                value = int(os.getenv(name, default))
            except ValueError as exc:
                raise RuntimeError(f"{name} must be an integer") from exc
            if value <= 0:
                raise RuntimeError(f"{name} must be positive")
            return value

        cache = Path(os.getenv("MODEL_CACHE_DIR", ".model-cache"))
        if not cache.is_absolute():
            cache = VERSION_ROOT / cache
        catalog = os.getenv("CATALOG_PATH")
        catalog_path = None if not catalog else Path(catalog)
        if catalog_path is not None and not catalog_path.is_absolute():
            catalog_path = VERSION_ROOT / catalog_path
        return cls(
            hf_repo_id = os.getenv("HF_REPO_ID"),
            hf_token = os.getenv("HF_TOKEN"),
            hf_repo_type = os.getenv("HF_REPO_TYPE", "model"),
            model_cache_dir = cache,
            catalog_path = catalog_path,
            top_k = positive("BLENDER_TOP_K", "10"),
            stage2_multiplier = positive("BLENDER_STAGE2_MULTIPLIER", "3"),
        )

    def require_repo(self) -> str:
        if not self.hf_repo_id:
            raise RuntimeError("HF_REPO_ID is required for explicit Hub access")
        return self.hf_repo_id
