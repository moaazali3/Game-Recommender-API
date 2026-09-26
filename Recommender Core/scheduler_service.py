"""Scheduled model maintenance jobs.

Database access is created only when a job runs, so importing this module does
not require the application's external ``config`` module.
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd
from scipy.sparse import vstack

try:
    from . import build_model
    from .recommender import GameRecommender
    from .logging_utils import configure_logging
except ImportError:
    import build_model
    from recommender import GameRecommender
    from logging_utils import configure_logging

configure_logging()
logger = logging.getLogger(__name__)

CURRENT_DIR = Path(__file__).resolve().parent
DATES_DIR = CURRENT_DIR / "Dates"
LOG_FILE = DATES_DIR / "execution_dates.json"
MODEL_UPDATE_LOCK = threading.RLock()


def log_execution_date(action_name: str) -> None:
    """Record the latest successful execution time for a named job."""
    DATES_DIR.mkdir(parents = True, exist_ok = True)

    history: dict[str, str] = {}

    if LOG_FILE.exists():
        try:
            loaded = json.loads(LOG_FILE.read_text(encoding = "utf-8"))

            if isinstance(loaded, dict):
                history = {str(k): str(v) for k, v in loaded.items()}

        except (OSError, json.JSONDecodeError):
            logger.exception("component=scheduler operation=history stage=read failure=history_file next_action=recreate execution history")

    history[action_name] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        LOG_FILE.write_text(json.dumps(history, indent = 4), encoding = "utf-8")
    except Exception:
        logger.exception("component=scheduler operation=history stage=write failure=filesystem next_action=check Dates directory permissions")
        raise


def train_and_save_pipeline(engine: Any = None) -> int:
    """Train and persist a complete model, returning its game count."""
    logger.info("component=training operation=pipeline stage=start next_action=resolve database engine")
    database_engine = engine or build_model.get_engine()

    count = build_model.train_and_save(database_engine)
    logger.info("component=training operation=pipeline stage=complete rows=%d next_action=reload model", count)

    return count


def run_monthly_retrain(recommender_holder: dict[str, Any], engine: Any = None) -> None:
    """Run a full retrain and replace the in-memory recommender on success."""
    try:
        with MODEL_UPDATE_LOCK:
            train_and_save_pipeline(engine)
            recommender_holder["instance"] = GameRecommender()

        log_execution_date("last_monthly_retrain")
        logger.info("component=scheduler operation=monthly_retrain stage=complete next_action=record execution date")

    except Exception:
        logger.exception("component=scheduler operation=monthly_retrain stage=execute failure=job next_action=retain current model and retry next schedule")


def run_weekly_transform(recommender_holder: dict[str, Any], engine: Any = None) -> None:
    """Append higher-AppID games to persisted matrices when possible.

    The operation uses the already persisted vectorizers, writes the appended
    artifacts, and reloads the holder. It intentionally requires monotonically
    increasing Appid values; otherwise a full monthly retrain is safer.
    """
    try:
        recommender = recommender_holder.get("instance")

        if recommender is None:
            logger.warning("component=scheduler operation=weekly_transform stage=validation failure=model_unavailable next_action=run monthly retrain")
            return

        with MODEL_UPDATE_LOCK:
            database_engine = engine or build_model.get_engine()

            try:
                database_games = build_model.load_games(database_engine)
            except Exception:
                logger.exception("component=database operation=query stage=weekly_transform failure=query next_action=check database connectivity and schema")
                raise

            saved_count = len(recommender.app_ids)
            database_ids = build_model.validate_app_ids(database_games["Appid"].tolist(), source = "weekly database IDs", allow_numeric_strings = False)
            saved_ids = build_model.validate_app_ids(recommender.app_ids.tolist(), source = "weekly saved IDs", allow_numeric_strings = False)

            if database_ids[:saved_count] != saved_ids:
                logger.info("component=scheduler operation=weekly_transform stage=branch reason=data_prefix_mismatch saved_count=%d database_count=%d next_action=run full monthly retrain", saved_count, len(database_ids))
                logger.warning("component=scheduler operation=weekly_transform stage=validation failure=data_prefix_mismatch next_action=run full monthly retrain")
                run_monthly_retrain(recommender_holder, database_engine)
                return

            if len(database_ids) <= saved_count:
                logger.info("component=scheduler operation=weekly_transform stage=branch reason=no_new_games saved_count=%d database_count=%d next_action=wait for next schedule", saved_count, len(database_ids))
                logger.info("component=scheduler operation=weekly_transform stage=complete next_action=wait for next schedule")
                return

            new_games = database_games.iloc[saved_count:].copy()
            logger.info("component=scheduler operation=weekly_transform stage=branch reason=new_games_detected appended_rows=%d", len(new_games))
            processed = build_model.preprocess(new_games, {"Tags": {",": " "}, "keywords": {",": " "}})
            new_tag_matrix = recommender.tag_vectorizer.transform(processed["Tags"])
            new_keyword_matrix = recommender.keyword_vectorizer.transform(processed["keywords"])

            build_model.save_model(
                recommender.tag_vectorizer,
                recommender.keyword_vectorizer,
                vstack([recommender.tag_matrix, new_tag_matrix]),
                vstack([recommender.keyword_matrix, new_keyword_matrix]),
                saved_ids + build_model.validate_app_ids(processed["Appid"].tolist(), source = "weekly appended IDs", allow_numeric_strings = False),
                model_dir = recommender.model_dir,
            )

            recommender_holder["instance"] = GameRecommender(recommender.model_dir)

        log_execution_date("last_weekly_transform")
        logger.info("component=scheduler operation=weekly_transform stage=complete appended_rows=%d next_action=record execution date", len(new_games))

    except Exception:
        logger.exception("component=scheduler operation=weekly_transform stage=execute failure=job next_action=retain current model and retry next schedule")


def ensure_initial_model_exists(recommender_holder: dict[str, Any]) -> None:
    """Load an existing model or bootstrap one from the configured database."""
    model_directory = Path(build_model.MODEL_DIR)
    model_file = model_directory / "tag_matrix.npz"
    manifest_file = model_directory / "active_manifest.json"

    if not model_file.exists() and not manifest_file.exists():
        logger.info("component=model operation=bootstrap stage=missing_artifact next_action=run initial retrain")
        run_monthly_retrain(recommender_holder)

    else:
        try:
            recommender_holder["instance"] = GameRecommender()
        except (FileNotFoundError, ValueError):
            logger.exception("component=model operation=bootstrap stage=load failure=invalid_artifact next_action=run initial retrain")
            run_monthly_retrain(recommender_holder)
