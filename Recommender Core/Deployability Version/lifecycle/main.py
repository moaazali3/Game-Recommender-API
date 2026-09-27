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


def _run_bootstrap_and_init(settings, storage, scheduler):
    """Heavy training/bootstrap logic run in a separate thread."""
    try:
        scheduler.run_monthly()
        generation = storage.active_generation()
        if generation is not None:
            holder.current = GameRecommender(
                settings.cache_dir,
                generation,
            )
            logger.info(
                "component=startup operation=model_bootstrap "
                "status=ready generation=%s",
                generation,
            )
    except Exception:
        logger.exception(
            "component=startup operation=model_bootstrap "
            "status=failed; continuing_without_model"
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
            logger.exception("component=config operation=load status=invalid")
            yield
            return

        if settings.hf_repo_id:
            storage = HubStorage(
                settings.hf_repo_id,
                settings.hf_token,
                settings.hf_repo_type,
                settings.cache_dir,
            )

            generation = None

            try:
                generation = storage.active_generation()
            except ActiveGenerationUnavailable:
                if not settings.database_url:
                    logger.warning(
                        "component=startup operation=model_load "
                        "status=unavailable reason=active_generation_missing"
                    )
                else:
                    logger.warning(
                        "component=startup operation=model_bootstrap "
                        "status=starting_background reason=active_generation_missing"
                    )

                    scheduler = DeploymentScheduler(
                        storage,
                        settings.database_url,
                        settings.cache_dir,
                        model_holder=holder,
                    )

                    loop = asyncio.get_running_loop()
                    loop.run_in_executor(
                        None,
                        _run_bootstrap_and_init,
                        settings,
                        storage,
                        scheduler,
                    )

            if generation is not None:
                holder.current = GameRecommender(
                    settings.cache_dir,
                    generation,
                )

                logger.info(
                    "component=startup operation=model_load "
                    "status=ready generation=%s",
                    generation,
                )

            if settings.database_url:
                if scheduler is None:
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