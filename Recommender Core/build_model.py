"""Train and persist the game's TF-IDF recommendation model.

The module intentionally keeps database access behind explicit functions. Importing
it is therefore safe in CLI, API, and test processes that do not provide the
application's external ``config`` module.
"""

from __future__ import annotations

import os
import json
import logging
import tempfile
import uuid
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Mapping

import joblib
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix, save_npz
from sklearn.feature_extraction.text import TfidfVectorizer
from sqlalchemy import Engine, create_engine

try:
    from .logging_utils import configure_logging
except ImportError:
    from logging_utils import configure_logging

configure_logging()
logger = logging.getLogger(__name__)


def _database_failure_kind(error: BaseException) -> str:
    """Return a safe database failure label without exposing connection details."""
    if getattr(error, "winerror", None) == 11001 or getattr(error, "errno", None) == 11001:
        return "dns_errno_11001"

    if "11001" in str(error):
        return "dns_errno_11001"

    return "connection"

CURRENT_DIR = Path(__file__).resolve().parent
MODEL_DIR = str(CURRENT_DIR / "model")

_TAG_COLUMNS = {"Tags": {",": " "}, "keywords": {",": " "}}
MIN_APP_ID = 0
MAX_APP_ID = (1 << 63) - 1


def validate_app_ids(
    values: Any,
    *,
    source: str,
    allow_numeric_strings: bool = False,
) -> list[int]:
    """Return canonical Python AppIDs, rejecting unsafe representations."""
    try:
        candidate_values = list(values)

    except TypeError as exc:
        logger.error("component=appid operation=validate stage=input failure=not_iterable source=%s", source)

        raise ValueError(f"AppIDs from {source} must be an iterable of values.") from exc

    validated: list[int] = []

    for index, value in enumerate(candidate_values):
        if value is None or (isinstance(value, (float, np.floating)) and not np.isfinite(value)):
            logger.error("component=appid operation=validate stage=value failure=null_or_nonfinite source=%s index=%d value=%r", source, index, value)

            raise ValueError(f"Invalid AppID at {source}[{index}]: null or non-finite value.")

        if isinstance(value, bool):
            logger.error("component=appid operation=validate stage=value failure=boolean source=%s index=%d value=%r", source, index, value)

            raise ValueError(f"Invalid AppID at {source}[{index}]: boolean is not an integer ID.")

        if isinstance(value, str):
            if not allow_numeric_strings:
                logger.error("component=appid operation=validate stage=value failure=string source=%s index=%d", source, index)

                raise ValueError(f"Invalid AppID at {source}[{index}]: strings are not allowed.")

            try:
                numeric = Decimal(value.strip())

            except (InvalidOperation, ValueError):
                numeric = None

        else:
            numeric = value

        try:
            if numeric is None:
                raise ValueError

            finite = numeric.is_finite() if isinstance(numeric, Decimal) else bool(np.isfinite(numeric))

            if not finite or numeric != int(numeric):
                raise ValueError

            app_id = int(numeric)

        except (TypeError, ValueError, OverflowError):
            logger.error("component=appid operation=validate stage=value failure=non_integral_or_numeric source=%s index=%d value=%r", source, index, value)

            raise ValueError(f"Invalid AppID at {source}[{index}]: expected an integral numeric value, got {value!r}.")

        if not MIN_APP_ID <= app_id <= MAX_APP_ID:
            logger.error("component=appid operation=validate stage=value failure=out_of_range source=%s index=%d value=%r", source, index, value)

            raise ValueError(f"Invalid AppID at {source}[{index}]: {app_id} is outside {MIN_APP_ID}..{MAX_APP_ID}.")

        validated.append(app_id)

    return validated


def validate_data_app_ids(data: pd.DataFrame, *, source: str) -> pd.DataFrame:
    """Validate and canonicalize the Appid column in a copied data frame."""
    if "Appid" not in data.columns:
        logger.error("component=appid operation=validate stage=column failure=missing source=%s", source)

        raise KeyError("Required model column is missing: 'Appid'")

    result = data.copy()
    result["Appid"] = validate_app_ids(result["Appid"].tolist(), source = source, allow_numeric_strings = True)

    return result


def preprocess(
    data: pd.DataFrame,
    columns: Mapping[str, Mapping[str, str]],
) -> pd.DataFrame:
    """Normalize text columns without mutating the input frame.

    Args:
        data: Frame containing the source game data.
        columns: Mapping of column names to separator replacements.

    Returns:
        A copied frame with nulls converted to empty strings and replacements
        applied in the order supplied.

    Raises:
        KeyError: If a requested column is absent.
    """
    result = data.copy()
    logger.info("component=preprocessing operation=normalize stage=start rows=%d next_action=validate_columns", len(result))

    for column, replacements in columns.items():
        if column not in result.columns:
            logger.error("component=preprocessing operation=normalize stage=validation failure=missing_column next_action=provide_required_model_columns")

            raise KeyError(f"Required model column is missing: {column!r}")

        values = result[column].fillna("").astype(str)

        for old_separator, new_separator in replacements.items():
            values = values.str.replace(old_separator, new_separator, regex = False)

        result[column] = values

    logger.info("component=preprocessing operation=normalize stage=complete rows=%d next_action=fit_vectorizers", len(result))

    return result


def build_model(
    data: pd.DataFrame,
) -> tuple[TfidfVectorizer, TfidfVectorizer, csr_matrix, csr_matrix]:
    """Fit the two explicit TF-IDF vectorizers used by recommendations.

    The feature settings and separate tag/keyword representations are retained
    to preserve the established recommendation scores.
    """
    data = validate_data_app_ids(data, source = "build_model")

    for column in ("Tags", "keywords"):
        if column not in data.columns:
            logger.error("component=model operation=build stage=validation failure=missing_column next_action=provide_required_model_columns")

            raise KeyError(f"Required model column is missing: {column!r}")

    logger.info("component=tfidf operation=fit stage=start rows=%d next_action=fit_tag_vectorizer", len(data))

    tag_vectorizer = TfidfVectorizer(
        analyzer = "char_wb", ngram_range = (3, 5), sublinear_tf = True,
        max_features = 50000, norm = "l2",
    )
    keyword_vectorizer = TfidfVectorizer(
        analyzer = "char_wb", ngram_range = (2, 4), sublinear_tf = True,
        max_features = 50000, norm = "l2",
    )

    tag_matrix = tag_vectorizer.fit_transform(data["Tags"])
    keyword_matrix = keyword_vectorizer.fit_transform(data["keywords"])

    logger.info("component=tfidf operation=fit stage=complete tag_features=%d keyword_features=%d next_action=stage_artifacts", tag_matrix.shape[1], keyword_matrix.shape[1])

    return tag_vectorizer, keyword_vectorizer, tag_matrix.tocsr(), keyword_matrix.tocsr()


def save_model(
    tag_vectorizer: TfidfVectorizer,
    keyword_vectorizer: TfidfVectorizer,
    tag_matrix: csr_matrix,
    keyword_matrix: csr_matrix,
    app_ids: Any,
    model_dir: str | os.PathLike[str] = MODEL_DIR,
) -> None:
    """Persist one generation and publish it atomically for readers.

    The callable signature intentionally remains unchanged. New writes use a
    versioned directory and an atomically replaced ``active_manifest.json``;
    readers without a manifest continue to support the historical flat files.
    """
    validated_app_ids = validate_app_ids(app_ids, source = "save_model", allow_numeric_strings = False)
    app_ids_array = np.asarray(validated_app_ids, dtype = np.int64)

    if app_ids_array.dtype.kind not in "iu":
        logger.error("component=appid operation=save stage=validation failure=non_integer_dtype")

        raise ValueError("AppID artifact must have an integer dtype.")

    destination = Path(model_dir)
    logger.info("component=artifacts operation=publish stage=start next_action=write_temporary_generation")
    destination.mkdir(parents = True, exist_ok = True)

    generation_name = f"generation-{uuid.uuid4().hex}"
    temporary_generation = Path(tempfile.mkdtemp(prefix = ".generation-", dir = destination))
    generation = destination / generation_name

    try:
        joblib.dump(tag_vectorizer, temporary_generation / "tag_vectorizer.joblib")
        joblib.dump(keyword_vectorizer, temporary_generation / "keyword_vectorizer.joblib")
        joblib.dump(app_ids_array, temporary_generation / "app_ids.joblib")

        save_npz(temporary_generation / "tag_matrix.npz", tag_matrix.tocsr())
        save_npz(temporary_generation / "keyword_matrix.npz", keyword_matrix.tocsr())

        os.replace(temporary_generation, generation)
        manifest = destination / "active_manifest.json"
        manifest_tmp = destination / f".active_manifest-{uuid.uuid4().hex}.tmp"

        manifest_tmp.write_text(
            json.dumps({"version": 1, "generation": generation_name}), encoding = "utf-8"
        )

        os.replace(manifest_tmp, manifest)
        logger.info("component=artifacts operation=publish stage=complete next_action=reload_model")

    finally:
        if temporary_generation.exists():
            for child in temporary_generation.iterdir():
                child.unlink()

            temporary_generation.rmdir()


def get_engine(database_url: str | None = None) -> Engine:
    """Create a SQLAlchemy engine from an explicit URL or external config.

    Args:
        database_url: SQLAlchemy URL. When omitted, ``config.DATABASE_URL`` is
            imported lazily for compatibility with the host application.

    Raises:
        RuntimeError: If no URL is supplied and external config is unavailable
            or does not define ``DATABASE_URL``.
    """
    if database_url is None:
        try:
            import config

            database_url = getattr(config, "DATABASE_URL")

        except (ImportError, AttributeError) as exc:
            logger.error("component=database operation=config stage=resolution failure=missing_config next_action=provide database_url or config.DATABASE_URL")

            raise RuntimeError(
                "Database configuration is required; pass database_url or provide config.DATABASE_URL."
            ) from exc

    if not database_url:
        logger.error("component=database operation=config stage=validation failure=missing_config next_action=provide a non-empty database_url")

        raise RuntimeError("Database configuration contains an empty DATABASE_URL.")

    logger.info("component=database operation=engine stage=create next_action=connect on first use")
    try:
        return create_engine(database_url, pool_pre_ping = True)
    except Exception:
        logger.exception("component=database operation=engine stage=create failure=connection_config next_action=check driver and database host")
        raise


def load_games(engine: Engine) -> pd.DataFrame:
    """Read the canonical ordered game columns from a database engine."""
    logger.info("component=database operation=query stage=start query=load_games next_action=read ordered model columns")

    try:
        data = pd.read_sql("SELECT Appid, Tags, keywords FROM games ORDER BY Appid ASC", engine)
    except Exception as exc:
        logger.exception("component=database operation=query stage=execute failure=%s next_action=check database connectivity and schema", _database_failure_kind(exc))
        raise

    try:
        data = validate_data_app_ids(data, source = "database load_games")
    except Exception:
        logger.exception("component=database operation=query stage=validation failure=invalid_appid next_action=repair database values")
        raise

    logger.info("component=database operation=query stage=complete rows=%d next_action=preprocess", len(data))

    return data


def train_and_save(engine: Engine, model_dir: str | os.PathLike[str] = MODEL_DIR) -> int:
    """Build and persist a model from the supplied database engine.

    Returns:
        Number of games represented by the persisted model.
    """
    logger.info("component=training operation=train stage=start next_action=load_games")

    try:
        data = load_games(engine)
    except Exception:
        logger.exception("component=training operation=train stage=database_loading failure=database")
        raise

    try:
        data = preprocess(data, _TAG_COLUMNS)
    except Exception:
        logger.exception("component=training operation=train stage=preprocessing failure=preprocess")
        raise

    try:
        artifacts = build_model(data)
    except Exception:
        logger.exception("component=training operation=train stage=vectorizer_fitting failure=tfidf")
        raise

    try:
        save_model(*artifacts, data["Appid"].to_numpy(), model_dir = model_dir)
    except Exception:
        logger.exception("component=training operation=train stage=artifact_publication failure=publish")
        raise

    logger.info("component=training operation=train stage=complete rows=%d next_action=serve_or_reload_model", len(data))

    return len(data)