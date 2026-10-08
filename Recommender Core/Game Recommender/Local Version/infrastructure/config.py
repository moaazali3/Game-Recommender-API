"""Root-loaded environment configuration for the local recommender."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(REPOSITORY_ROOT / ".env")


@dataclass(frozen = True)
class Settings:
    database_url: str | None
    model_storage_dir: Path
    log_level: str
    api_host: str
    api_port: int

    @classmethod
    def from_env(cls) -> "Settings":
        try:
            api_port = int(os.getenv("API_PORT", "8000"))
        except ValueError as exc:
            raise RuntimeError("API_PORT must be an integer.") from exc

        storage = Path(os.getenv("MODEL_STORAGE_DIR", ".model-storage"))
        if not storage.is_absolute():
            storage = REPOSITORY_ROOT / storage

        return cls(
            database_url = os.getenv("DATABASE_URL"),
            model_storage_dir = storage,
            log_level = os.getenv("LOG_LEVEL", "INFO").upper(),
            api_host = os.getenv("API_HOST", "127.0.0.1"),
            api_port = api_port,
        )

    def require_database(self) -> str:
        if not self.database_url:
            raise RuntimeError("DATABASE_URL is required for training.")
        return self.database_url
