"""FastAPI request contract and recommendation route."""
from __future__ import annotations
from typing import Any
from fastapi import APIRouter
from pydantic import BaseModel, Field, ConfigDict

class PageRequest(BaseModel):
    model_config = ConfigDict(extra = "ignore")
    app_id: int | None = None
    filters: dict[str, Any] = Field(default_factory = dict)
    top_n: int | None = None


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

    return router
