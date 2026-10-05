"""Shared deployment lifecycle and application components."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
import logging

from infrastructure.config import Settings
from infrastructure.logging_utils import configure_logging
from infrastructure.storage import HubStorage, ActiveGenerationUnavailable
from ml.recommender import GameRecommender
from api.routes import make_router
from .scheduler_service import DeploymentScheduler


configure_logging()
logger = logging.getLogger(__name__)


class ModelHolder:
    def __init__(self):
        self.current = None


holder = ModelHolder()


def _initialize_model_in_background(settings, storage, scheduler):
    """Run model discovery, bootstrap, downloads, and model loading in a background thread."""
    try:
        generation = None

        try:
            generation = storage.active_generation()

        except ActiveGenerationUnavailable:
            if settings.database_url and scheduler is not None:
                logger.warning(
                    "component=startup operation=model_bootstrap "
                    "status=starting_background reason=active_generation_missing"
                )

                scheduler.run_monthly()
                generation = storage.active_generation()

            else:
                logger.warning(
                    "component=startup operation=model_load "
                    "status=unavailable reason=active_generation_missing"
                )

        if generation is not None:
            logger.info(
                "component=startup operation=model_load "
                "status=loading generation=%s",
                generation,
            )

            holder.current = GameRecommender(
                settings.cache_dir,
                generation,
            )

            logger.info(
                "component=startup operation=model_load "
                "status=ready generation=%s",
                generation,
            )

        else:
            logger.warning(
                "component=startup operation=model_load "
                "status=unavailable reason=no_generation"
            )

    except Exception:
        holder.current = None
        logger.exception(
            "component=startup operation=model_init status=failed"
        )


@asynccontextmanager
async def lifespan(application):
    logger.info("component=lifecycle operation=lifespan_entered")

    scheduler = None
    apscheduler = None

    try:
        try:
            settings = Settings.from_env()
        except Exception:
            logger.exception(
                "component=config operation=load status=invalid"
            )
            yield
            return

        if settings.hf_repo_id:
            storage = HubStorage(
                settings.hf_repo_id,
                settings.hf_token,
                settings.hf_repo_type,
                settings.cache_dir,
            )

            if settings.database_url:
                scheduler = DeploymentScheduler(
                    storage,
                    settings.database_url,
                    settings.cache_dir,
                    model_holder=holder,
                )

                from apscheduler.schedulers.asyncio import AsyncIOScheduler

                apscheduler = AsyncIOScheduler()

                apscheduler.add_job(
                    scheduler.run_monthly,
                    "cron",
                    day=1,
                    hour=2,
                    minute=0,
                    id="monthly-retrain",
                    replace_existing=True,
                )

                apscheduler.add_job(
                    scheduler.run_weekly,
                    "cron",
                    day_of_week="sat",
                    hour=4,
                    minute=0,
                    id="weekly-update",
                    replace_existing=True,
                )

                apscheduler.start()

                logger.info(
                    "component=scheduler operation=start "
                    "status=ready monthly=01@02:00 weekly=sat@04:00"
                )

            loop = asyncio.get_running_loop()

            loop.run_in_executor(
                None,
                _initialize_model_in_background,
                settings,
                storage,
                scheduler,
            )

        else:
            logger.warning(
                "component=startup operation=model_load "
                "status=unavailable reason=missing HF_REPO_ID"
            )

    except Exception:
        holder.current = None
        logger.exception(
            "component=startup operation=model_load status=unavailable"
        )

    logger.info("component=lifecycle operation=lifespan_ready")

    try:
        yield

    finally:
        logger.info("component=lifecycle operation=lifespan_shutdown")

        if apscheduler is not None:
            try:
                apscheduler.shutdown(wait=False)
            except Exception:
                logger.exception(
                    "component=scheduler operation=shutdown failure=ignored"
                )

        holder.current = None


router = make_router(holder)