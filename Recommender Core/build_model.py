"""Train and persist the game's TF-IDF recommendation model.

The module intentionally keeps database access behind explicit functions. Importing
it is therefore safe in CLI, API, and test processes that do not provide the
application's external ``config`` module.
"""

from __future__ import annotations

import os
import json
import tempfile
import uuid
from pathlib import Path
from typing import Any, Mapping

import joblib
import pandas as pd
from scipy.sparse import csr_matrix, save_npz
from sklearn.feature_extraction.text import TfidfVectorizer
from sqlalchemy import Engine, create_engine

CURRENT_DIR = Path(__file__).resolve().parent
MODEL_DIR = str(CURRENT_DIR / "model")

_TAG_COLUMNS = {"Tags": {",": " "}, "keywords": {",": " "}}


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

    for column, replacements in columns.items():
        if column not in result.columns:
            raise KeyError(f"Required model column is missing: {column!r}")

        values = result[column].fillna("").astype(str)

        for old_separator, new_separator in replacements.items():
            values = values.str.replace(old_separator, new_separator, regex = False)

        result[column] = values

    return result


def build_model(
    data: pd.DataFrame,
) -> tuple[TfidfVectorizer, TfidfVectorizer, csr_matrix, csr_matrix]:
    """Fit the two explicit TF-IDF vectorizers used by recommendations.

    The feature settings and separate tag/keyword representations are retained
    to preserve the established recommendation scores.
    """
    for column in ("Tags", "keywords"):
        if column not in data.columns:
            raise KeyError(f"Required model column is missing: {column!r}")

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
    destination = Path(model_dir)
    destination.mkdir(parents = True, exist_ok = True)

    generation_name = f"generation-{uuid.uuid4().hex}"
    temporary_generation = Path(tempfile.mkdtemp(prefix = ".generation-", dir = destination))
    generation = destination / generation_name

    try:
        joblib.dump(tag_vectorizer, temporary_generation / "tag_vectorizer.joblib")
        joblib.dump(keyword_vectorizer, temporary_generation / "keyword_vectorizer.joblib")
        joblib.dump(app_ids, temporary_generation / "app_ids.joblib")

        save_npz(temporary_generation / "tag_matrix.npz", tag_matrix.tocsr())
        save_npz(temporary_generation / "keyword_matrix.npz", keyword_matrix.tocsr())

        os.replace(temporary_generation, generation)
        manifest = destination / "active_manifest.json"
        manifest_tmp = destination / f".active_manifest-{uuid.uuid4().hex}.tmp"

        manifest_tmp.write_text(
            json.dumps({"version": 1, "generation": generation_name}), encoding = "utf-8"
        )

        os.replace(manifest_tmp, manifest)

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
            raise RuntimeError(
                "Database configuration is required; pass database_url or provide config.DATABASE_URL."
            ) from exc

    if not database_url:
        raise RuntimeError("Database configuration contains an empty DATABASE_URL.")

    return create_engine(database_url, pool_pre_ping = True)


def load_games(engine: Engine) -> pd.DataFrame:
    """Read the canonical ordered game columns from a database engine."""
    return pd.read_sql(
        "SELECT Appid, Tags, keywords FROM games ORDER BY Appid ASC", engine
    )


def train_and_save(engine: Engine, model_dir: str | os.PathLike[str] = MODEL_DIR) -> int:
    """Build and persist a model from the supplied database engine.

    Returns:
        Number of games represented by the persisted model.
    """
    data = preprocess(load_games(engine), _TAG_COLUMNS)
    artifacts = build_model(data)

    save_model(*artifacts, data["Appid"].to_numpy(), model_dir = model_dir)

    return len(data)