"""Blender lifecycle holder."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import APIRouter

from api.routes import make_router
from infrastructure.config import Settings
from ml.blender import GameBlender, GameRecommenderClient


class Holder:
    current: GameBlender | None = None


holder = Holder()
router = APIRouter()


@asynccontextmanager
async def lifespan(app):
    settings = Settings.from_env()
    holder.current = GameBlender(GameRecommenderClient(
        settings.game_recommender_url,
        settings.game_recommender_token,
    ))
    yield
    holder.current = None


router = make_router(holder, Settings)