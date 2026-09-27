"""Environment-only configuration for the Space."""
from __future__ import annotations
import os
from dataclasses import dataclass
from pathlib import Path

@dataclass(frozen=True)
class Settings:
    hf_token: str | None
    hf_repo_id: str | None
    hf_repo_type: str
    database_url: str | None
    cache_dir: Path
    log_level: str

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(os.getenv("HF_TOKEN"), os.getenv("HF_REPO_ID"), os.getenv("HF_REPO_TYPE", "model"), os.getenv("DATABASE_URL"), Path(os.getenv("MODEL_CACHE_DIR", ".model-cache")), os.getenv("LOG_LEVEL", "INFO"))

    def require_storage(self) -> None:
        if not self.hf_repo_id:
            raise RuntimeError("HF_REPO_ID is required for model storage.")

    def require_database(self) -> str:
        if not self.database_url:
            raise RuntimeError("DATABASE_URL is required for training.")
        return self.database_url
