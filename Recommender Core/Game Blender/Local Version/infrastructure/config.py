"""Environment configuration for the local Blender."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


VERSION_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen = True)
class Settings:
    model_storage_dir: Path
    catalog_path: Path | None
    top_k: int
    stage2_multiplier: int
    api_host: str
    api_port: int

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

        model_dir = Path(os.getenv("MODEL_STORAGE_DIR", ".model-storage"))
        if not model_dir.is_absolute():
            model_dir = VERSION_ROOT / model_dir
        catalog = os.getenv("CATALOG_PATH")
        catalog_path = None if not catalog else Path(catalog)
        if catalog_path is not None and not catalog_path.is_absolute():
            catalog_path = VERSION_ROOT / catalog_path
        try:
            api_port = int(os.getenv("API_PORT", "8000"))
        except ValueError as exc:
            raise RuntimeError("API_PORT must be an integer") from exc
        return cls(
            model_storage_dir = model_dir,
            catalog_path = catalog_path,
            top_k = positive("BLENDER_TOP_K", "10"),
            stage2_multiplier = positive("BLENDER_STAGE2_MULTIPLIER", "3"),
            api_host = os.getenv("API_HOST", "127.0.0.1"),
            api_port = api_port,
        )
