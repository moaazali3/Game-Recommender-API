"""Blender lifecycle holder."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import APIRouter

from api.routes import make_router
from infrastructure.config import Settings
from infrastructure.storage import HubStorage
from ml.blender import GameBlender


class Holder:
    current: GameBlender | None = None


holder = Holder()
router = APIRouter()


@asynccontextmanager
async def lifespan(app):
    settings = Settings.from_env()
    try:
        bundle = HubStorage(
            settings.hf_repo_id,
            settings.hf_token,
            settings.hf_repo_type,
            settings.model_cache_dir,
        ).load(settings.catalog_path)
    except (FileNotFoundError, KeyError, ValueError, RuntimeError):
        holder.current = None
    else:
        holder.current = GameBlender(bundle)
    yield
    holder.current = None


router = make_router(holder, Settings)
