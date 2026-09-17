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

except ImportError:
    import build_model
    from recommender import GameRecommender

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
            logger.warning("Could not read execution history; recreating it.")

    history[action_name] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    LOG_FILE.write_text(json.dumps(history, indent = 4), encoding = "utf-8")


def train_and_save_pipeline(engine: Any = None) -> int:
    """Train and persist a complete model, returning its game count."""
    database_engine = engine or build_model.get_engine()
    logger.info("Reading data from SQL for model build...")

    count = build_model.train_and_save(database_engine)
    logger.info("Model persisted for %d games.", count)

    return count


def run_monthly_retrain(recommender_holder: dict[str, Any], engine: Any = None) -> None:
    """Run a full retrain and replace the in-memory recommender on success."""
    try:
        with MODEL_UPDATE_LOCK:
            train_and_save_pipeline(engine)
            recommender_holder["instance"] = GameRecommender()

        log_execution_date("last_monthly_retrain")
        logger.info("Monthly retraining and reload completed.")

    except Exception:
        logger.exception("Monthly retraining failed")


def run_weekly_transform(recommender_holder: dict[str, Any], engine: Any = None) -> None:
    """Append higher-AppID games to persisted matrices when possible.

    The operation uses the already persisted vectorizers, writes the appended
    artifacts, and reloads the holder. It intentionally requires monotonically
    increasing Appid values; otherwise a full monthly retrain is safer.
    """
    try:
        recommender = recommender_holder.get("instance")
        if recommender is None:
            logger.warning("Skipping weekly transform because no model is loaded.")
            return

        with MODEL_UPDATE_LOCK:
            database_engine = engine or build_model.get_engine()
            database_games = pd.read_sql(
                "SELECT Appid, Tags, keywords FROM games ORDER BY Appid ASC", database_engine
            )

            saved_count = len(recommender.app_ids)
            database_ids = database_games["Appid"].tolist()
            saved_ids = recommender.app_ids.tolist()

            if database_ids[:saved_count] != saved_ids:
                logger.warning("Stored AppID prefix differs from database; requesting full retrain.")
                run_monthly_retrain(recommender_holder, database_engine)
                return

            if len(database_ids) <= saved_count:
                logger.info("Database is up to date; no weekly transform required.")
                return

            new_games = database_games.iloc[saved_count:].copy()
            processed = build_model.preprocess(new_games, {"Tags": {",": " "}, "keywords": {",": " "}})
            new_tag_matrix = recommender.tag_vectorizer.transform(processed["Tags"])
            new_keyword_matrix = recommender.keyword_vectorizer.transform(processed["keywords"])

            build_model.save_model(
                recommender.tag_vectorizer,
                recommender.keyword_vectorizer,
                vstack([recommender.tag_matrix, new_tag_matrix]),
                vstack([recommender.keyword_matrix, new_keyword_matrix]),
                saved_ids + list(processed["Appid"]),
                model_dir = recommender.model_dir,
            )

            recommender_holder["instance"] = GameRecommender(recommender.model_dir)

        log_execution_date("last_weekly_transform")
        logger.info("Weekly transform appended %d games and reloaded the model.", len(new_games))

    except Exception:
        logger.exception("Weekly transform job encountered an error")


def ensure_initial_model_exists(recommender_holder: dict[str, Any]) -> None:
    """Load an existing model or bootstrap one from the configured database."""
    model_directory = Path(build_model.MODEL_DIR)
    model_file = model_directory / "tag_matrix.npz"
    manifest_file = model_directory / "active_manifest.json"

    if not model_file.exists() and not manifest_file.exists():
        logger.info("Model files not detected; running initial bootstrap.")
        run_monthly_retrain(recommender_holder)

    else:
        try:
            recommender_holder["instance"] = GameRecommender()

        except (FileNotFoundError, ValueError):
            logger.exception("Existing model artifacts are incomplete or inconsistent.")
            run_monthly_retrain(recommender_holder)
