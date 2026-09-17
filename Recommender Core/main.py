"""FastAPI application entry point for the recommendation service."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI

try:
    from .Routes import DynamicPageRouter
    from .Services import PageBuilder
    from . import scheduler_service

except ImportError:
    from Routes import DynamicPageRouter
    from Services import PageBuilder
    import scheduler_service

engine_holder: dict[str, Any] = {"instance": None}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the model and manage the background maintenance scheduler."""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger

    except ImportError as exc:
        raise RuntimeError("APScheduler is required to run the scheduled API service.") from exc

    scheduler_service.ensure_initial_model_exists(engine_holder)

    scheduler = BackgroundScheduler()

    scheduler.add_job(
        lambda: scheduler_service.run_monthly_retrain(engine_holder),
        CronTrigger(day = 1, hour = 2, minute = 0),
    )
    scheduler.add_job(
        lambda: scheduler_service.run_weekly_transform(engine_holder),
        CronTrigger(day_of_week = "sat", hour = 4, minute = 0),
    )

    scheduler.start()

    try:
        yield

    finally:
        scheduler.shutdown(wait = False)


def build_recommendations(request: Any) -> dict[str, Any]:
    """Resolve a recommendation request from the current model holder."""
    recommender = engine_holder.get("instance")

    if recommender is None:
        return {"error": "Recommendation model is not available."}

    return recommender.get_recommendations_widget(request)


app = FastAPI(title = "Game Recommendation Engine", lifespan = lifespan)

game_page_builder = PageBuilder({"recommendations": build_recommendations})
game_page_router = DynamicPageRouter("/game-details", game_page_builder, methods = ["POST"])

app.include_router(game_page_router.router, prefix = "/api/v1")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host = "0.0.0.0", port = 8000, reload = False)
