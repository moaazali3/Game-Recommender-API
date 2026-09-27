"""FastAPI lifecycle, bootstrap, and scheduler wiring."""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from api.routes import make_router
from infrastructure.config import Settings
from infrastructure.logging_utils import configure_logging
from infrastructure.storage import ActiveGenerationUnavailable, LocalStorage
from ml.recommender import GameRecommender
from .scheduler_service import LocalScheduler

configure_logging()
logger = logging.getLogger(__name__)


class ModelHolder:
    def __init__(self):
        self.current = None


holder = ModelHolder()


def _run_bootstrap_and_init(settings, storage, scheduler):
    try:
        scheduler.run_monthly()
        generation = storage.active_generation()
        holder.current = GameRecommender(settings.model_storage_dir, generation)
        logger.info("component=startup operation=model_bootstrap status=ready generation=%s", generation)
    except Exception:
        logger.exception("component=startup operation=model_bootstrap status=failed")


@asynccontextmanager
async def lifespan(application):
    logger.info("component=lifecycle operation=lifespan_entered")
    scheduler = None
    apscheduler = None
    try:
        settings = Settings.from_env()
        storage = LocalStorage(settings.model_storage_dir)
        generation = None
        try:
            generation = storage.active_generation()
        except ActiveGenerationUnavailable:
            if settings.database_url:
                scheduler = LocalScheduler(storage, settings.database_url, settings.model_storage_dir, holder)
                loop = asyncio.get_running_loop()
                loop.run_in_executor(None, _run_bootstrap_and_init, settings, storage, scheduler)
            else:
                logger.warning("component=startup operation=model_load status=unavailable reason=active_generation_missing")

        if generation is not None:
            holder.current = GameRecommender(settings.model_storage_dir, generation)
            logger.info("component=startup operation=model_load status=ready generation=%s", generation)

        if settings.database_url:
            if scheduler is None:
                scheduler = LocalScheduler(storage, settings.database_url, settings.model_storage_dir, holder)
            from apscheduler.schedulers.asyncio import AsyncIOScheduler
            apscheduler = AsyncIOScheduler()
            apscheduler.add_job(scheduler.run_monthly, "cron", day = 1, hour = 2, minute = 0, id = "monthly-retrain", replace_existing = True)
            apscheduler.add_job(scheduler.run_weekly, "cron", day_of_week = "sat", hour = 4, minute = 0, id = "weekly-update", replace_existing = True)
            apscheduler.start()
            logger.info("component=scheduler operation=start status=ready monthly=01@02:00 weekly=sat@04:00")
    except Exception:
        holder.current = None
        logger.exception("component=startup operation=model_load status=unavailable")

    try:
        yield
    finally:
        if apscheduler is not None:
            try:
                apscheduler.shutdown(wait = False)
            except Exception:
                logger.exception("component=scheduler operation=shutdown status=failed")
        holder.current = None


router = make_router(holder)
