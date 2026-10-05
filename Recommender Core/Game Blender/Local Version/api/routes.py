"""Request and route contract for Game Blender."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field


class BlenderRequest(BaseModel):
    model_config = ConfigDict(extra = "ignore")
    selected_app_ids: list[int] = Field(min_length = 2, max_length = 4)
    top_k: int | None = None
    stage2_multiplier: int | None = None


def make_router(holder, settings_type) -> APIRouter:
    router = APIRouter()

    @router.post("/api/v1/game-blender")
    async def game_blender(request: BlenderRequest) -> dict[str, Any]:
        try:
            if holder.current is None:
                raise RuntimeError("Blender service is unavailable")
            settings = settings_type.from_env()
            recommendations = holder.current.recommend(
                request.selected_app_ids,
                settings.top_k if request.top_k is None else request.top_k,
                settings.stage2_multiplier if request.stage2_multiplier is None else request.stage2_multiplier,
            )
            return {"status": "success", "data": {"recommendations": recommendations}}
        except (RuntimeError, ValueError) as exc:
            return {"status": "error", "data": {}, "error": str(exc)}

    return router