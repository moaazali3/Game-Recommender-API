"""Environment configuration for the HTTP-only Blender."""
from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen = True)
class Settings:
    game_recommender_url: str
    game_recommender_token: str | None
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

        url = os.getenv("GAME_RECOMMENDER_URL", "http://127.0.0.1:8001").strip()
        if not url:
            raise RuntimeError("GAME_RECOMMENDER_URL is required")
        try:
            api_port = int(os.getenv("API_PORT", "8000"))
        except ValueError as exc:
            raise RuntimeError("API_PORT must be an integer") from exc
        return cls(
            game_recommender_url = url,
            game_recommender_token = os.getenv("GAME_RECOMMENDER_TOKEN") or None,
            top_k = positive("BLENDER_TOP_K", "10"),
            stage2_multiplier = positive("BLENDER_STAGE2_MULTIPLIER", "3"),
            api_host = os.getenv("API_HOST", "127.0.0.1"),
            api_port = api_port,
        )