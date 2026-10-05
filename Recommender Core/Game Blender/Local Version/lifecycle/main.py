"""Blender lifecycle holder."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import APIRouter

from api.routes import make_router
from infrastructure.config import Settings
from infrastructure.storage import LocalStorage
from ml.blender import GameBlender


class Holder:
    current: GameBlender | None = None


holder = Holder()
router = APIRouter()


@asynccontextmanager
async def lifespan(app):
    settings = Settings.from_env()
    try:
        bundle = LocalStorage(settings.model_storage_dir).load(settings.catalog_path)
    except (FileNotFoundError, KeyError, ValueError):
        holder.current = None
    else:
        holder.current = GameBlender(bundle)
    yield
    holder.current = None


router = make_router(holder, Settings)
