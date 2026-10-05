"""FastAPI request contracts and recommendation routes."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field


class PageRequest(BaseModel):
    model_config = ConfigDict(extra = "ignore")
    app_id: int | None = None
    filters: dict[str, Any] = Field(default_factory = dict)
    top_n: int | None = None


class MixRequest(BaseModel):
    model_config = ConfigDict(extra = "ignore")
    selected_app_ids: list[int] = Field(min_length = 2, max_length = 4)
    top_k: int = Field(default = 10, gt = 0)
    include_tags: bool = False


def make_router(recommender):
    router = APIRouter()

    @router.post("/api/v1/game-details")
    async def game_details(request: PageRequest):
        try:
            current = getattr(recommender, "current", recommender)
            if current is None:
                raise RuntimeError("Model is unavailable")
            return {"status": "success", "data": {"recommendations": current.get_recommendations_widget(request)}}
        except Exception:
            return {"status": "error", "data": {}, "error": "An internal error occurred while building the page.", "details": {"path": "/api/v1/game-details"}}

    @router.post("/api/v1/mix-recommendations")
    async def mix_recommendations(request: MixRequest):
        try:
            current = getattr(recommender, "current", recommender)
            if current is None:
                raise RuntimeError("Model is unavailable")
            result = current.recommend_mix(
                request.selected_app_ids,
                request.top_k,
                request.include_tags,
            )
            return {"status": "success", "data": result}
        except (RuntimeError, ValueError, KeyError) as exc:
            return {"status": "error", "data": {}, "error": str(exc), "details": {"path": "/api/v1/mix-recommendations"}}

    return router
