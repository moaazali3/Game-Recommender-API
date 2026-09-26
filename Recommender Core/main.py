"""FastAPI application entry point for the recommendation service."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI

try:
    from .logging_utils import configure_logging
except ImportError:
    from logging_utils import configure_logging

configure_logging()
logger = logging.getLogger(__name__)

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
        logger.exception("component=lifecycle operation=startup stage=dependency failure=missing_scheduler next_action=install APScheduler")
        raise RuntimeError("APScheduler is required to run the scheduled API service.") from exc

    logger.info("component=lifecycle operation=startup stage=started next_action=initialize model")
    logger.info("component=lifecycle operation=model_initialization stage=started")

    try:
        scheduler_service.ensure_initial_model_exists(engine_holder)
    except Exception:
        logger.exception("component=lifecycle operation=startup stage=model failure=lifecycle next_action=stop startup and inspect model or database")
        raise

    logger.info("component=lifecycle operation=model_initialization stage=completed")

    scheduler = BackgroundScheduler()
    logger.info("component=scheduler operation=setup stage=start next_action=register maintenance jobs")

    try:
        monthly_job = scheduler.add_job(
            lambda: scheduler_service.run_monthly_retrain(engine_holder),
            CronTrigger(day = 1, hour = 2, minute = 0),
        )

        logger.info("component=scheduler operation=register stage=complete job_id=%s schedule=day_1_02_00", monthly_job.id)
        weekly_job = scheduler.add_job(
            lambda: scheduler_service.run_weekly_transform(engine_holder),
            CronTrigger(day_of_week = "sat", hour = 4, minute = 0),
        )

        logger.info("component=scheduler operation=register stage=complete job_id=%s schedule=saturday_04_00", weekly_job.id)
        scheduler.start()
        logger.info("component=lifecycle operation=scheduler_initialization stage=completed")

    except Exception:
        logger.exception("component=scheduler operation=setup stage=start failure=scheduler next_action=inspect scheduler configuration")
        raise

    logger.info("component=lifecycle operation=startup stage=completed next_action=serve API requests")

    try:
        yield

    finally:
        logger.info("component=lifecycle operation=shutdown stage=started")
        try:
            scheduler.shutdown(wait = False)
            logger.info("component=lifecycle operation=scheduler_shutdown stage=completed")
            logger.info("component=lifecycle operation=shutdown stage=completed next_action=exit service")
        except Exception:
            logger.exception("component=lifecycle operation=shutdown stage=execute failure=lifecycle next_action=inspect scheduler state")
            raise


def build_recommendations(request: Any) -> dict[str, Any]:
    """Resolve a recommendation request from the current model holder."""
    recommender = engine_holder.get("instance")

    if recommender is None:
        logger.warning("component=api operation=recommend stage=validation failure=model_unavailable next_action=wait for model bootstrap")
        return {"error": "Recommendation model is not available."}

    try:
        return recommender.get_recommendations_widget(request)
    except Exception:
        logger.exception("component=api operation=recommend stage=inference failure=api next_action=return service error")
        raise


app = FastAPI(title = "Game Recommendation Engine", lifespan = lifespan)

game_page_builder = PageBuilder({"recommendations": build_recommendations})
game_page_router = DynamicPageRouter("/game-details", game_page_builder, methods = ["POST"])

app.include_router(game_page_router.router, prefix = "/api/v1")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host = "127.0.0.1", port = 1412, reload = False)
