"""Model training and artifact validation, independent of Recommender Core."""
from __future__ import annotations

import json
import os
import re
import tempfile
import uuid
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from scipy.sparse import load_npz, save_npz
from sklearn.feature_extraction.text import TfidfVectorizer


FILES = (
    "tag_vectorizer.joblib",
    "keyword_vectorizer.joblib",
    "app_ids.joblib",
    "tag_matrix.npz",
    "keyword_matrix.npz",
)
RAW_TAGS_FILE = "raw_tags.joblib"
RAW_KEYWORDS_FILE = "raw_keywords.joblib"
_GEN = re.compile(r"^generation-[0-9a-f]{16}-[a-f0-9]{32}$")


def validate_app_ids(values: Any, source: str, allow_numeric_strings: bool = False) -> list[int]:
    try:
        values = list(values)
    except TypeError as exc:
        raise ValueError(f"AppIDs from {source} must be iterable") from exc
    result = []
    for i, value in enumerate(values):
        if isinstance(value, bool) or value is None or (isinstance(value, (float, np.floating)) and not np.isfinite(value)):
            raise ValueError(f"Invalid AppID at {source}[{i}]")
        if isinstance(value, str):
            if not allow_numeric_strings:
                raise ValueError(f"Invalid AppID at {source}[{i}]: strings are not allowed")
            try:
                value = Decimal(value.strip())
            except (InvalidOperation, ValueError):
                raise ValueError(f"Invalid AppID at {source}[{i}]")
        try:
            finite = value.is_finite() if isinstance(value, Decimal) else np.isfinite(value)
            if not finite or value != int(value):
                raise ValueError
            value = int(value)
        except (TypeError, ValueError, OverflowError):
            raise ValueError(f"Invalid AppID at {source}[{i}]")
        if not 0 <= value <= (1 << 63) - 1:
            raise ValueError(f"Invalid AppID at {source}[{i}]")
        result.append(value)
    return result


def preprocess(data: pd.DataFrame) -> pd.DataFrame:
    required = {"Appid", "Tags", "keywords"}
    missing = required - set(data.columns)
    if missing:
        raise KeyError(f"Missing model columns: {sorted(missing)}")
    result = data.copy()
    result["Appid"] = validate_app_ids(result["Appid"].tolist(), "database", True)
    for col in ("Tags", "keywords"):
        result[col] = result[col].fillna("").astype(str).str.replace(",", " ", regex = False)
    return result


def load_games(engine) -> pd.DataFrame:
    return preprocess(pd.read_sql("SELECT Appid, Tags, keywords FROM games ORDER BY Appid ASC", engine))


def build_artifacts(data: pd.DataFrame):
    raw_tags = data["Tags"].fillna("").astype(str).tolist()
    raw_keywords = data["keywords"].fillna("").astype(str).tolist()
    data = preprocess(data)
    tags = TfidfVectorizer(
        analyzer = "char_wb",
        ngram_range = (3, 5),
        sublinear_tf = True,
        max_features = 50000,
        norm = "l2",
    )
    keywords = TfidfVectorizer(
        analyzer = "char_wb",
        ngram_range = (2, 4),
        sublinear_tf = True,
        max_features = 50000,
        norm = "l2",
    )
    tags.raw_tags_ = raw_tags
    keywords.raw_keywords_ = raw_keywords
    return (
        tags,
        keywords,
        tags.fit_transform(data.Tags).tocsr(),
        keywords.fit_transform(data.keywords).tocsr(),
        np.asarray(data.Appid, dtype = np.int64),
        raw_tags,
        raw_keywords,
    )


def write_generation(artifacts, root: str | os.PathLike[str]) -> str:
    root = Path(root)
    root.mkdir(parents = True, exist_ok = True)
    name = f"generation-{__import__('time').time_ns():016x}-{uuid.uuid4().hex}"
    tmp = Path(tempfile.mkdtemp(prefix = ".generation-", dir = root))
    final = root / name
    try:
        if len(artifacts) == 5:
            tag, key, tag_matrix, key_matrix, ids = artifacts
            raw_tags = raw_keywords = None
        elif len(artifacts) == 7:
            tag, key, tag_matrix, key_matrix, ids, raw_tags, raw_keywords = artifacts
        else:
            raise ValueError("Artifacts must contain five or seven values")
        joblib.dump(tag, tmp / FILES[0])
        joblib.dump(key, tmp / FILES[1])
        joblib.dump(ids, tmp / FILES[2])
        save_npz(tmp / FILES[3], tag_matrix)
        save_npz(tmp / FILES[4], key_matrix)
        if raw_tags is not None and raw_keywords is not None:
            joblib.dump(list(raw_tags), tmp / RAW_TAGS_FILE)
            joblib.dump(list(raw_keywords), tmp / RAW_KEYWORDS_FILE)
        validate_generation(tmp)
        os.replace(tmp, final)
        return name
    finally:
        if tmp.exists():
            for path in tmp.iterdir():
                path.unlink()
            tmp.rmdir()


def validate_generation(path: str | os.PathLike[str]) -> None:
    path = Path(path)
    if path.name.startswith("generation-") and not _GEN.fullmatch(path.name):
        raise ValueError("Unsafe generation name")
    missing = [file_name for file_name in FILES if not (path / file_name).is_file()]
    if missing:
        raise ValueError(f"Missing artifacts: {missing}")
    ids = joblib.load(path / "app_ids.joblib")
    if not isinstance(ids, np.ndarray) or ids.ndim != 1 or ids.dtype.kind not in "iu":
        raise ValueError("AppID artifact must be a 1D integer NumPy array")
    canonical = validate_app_ids(ids.tolist(), "model artifact")
    if len(set(canonical)) != len(canonical):
        raise ValueError("Duplicate AppIDs")
    tag, key = joblib.load(path / FILES[0]), joblib.load(path / FILES[1])
    tag_matrix, key_matrix = load_npz(path / FILES[3]), load_npz(path / FILES[4])
    if (
        tag_matrix.shape[0] != len(ids)
        or key_matrix.shape[0] != len(ids)
        or tag_matrix.shape[1] != len(getattr(tag, "vocabulary_", {}))
        or key_matrix.shape[1] != len(getattr(key, "vocabulary_", {}))
    ):
        raise ValueError("Artifact dimensions disagree")
    raw_tags_path = path / RAW_TAGS_FILE
    raw_keywords_path = path / RAW_KEYWORDS_FILE
    if raw_tags_path.is_file() != raw_keywords_path.is_file():
        raise ValueError("Raw tag and keyword metadata must be published together")
    if raw_tags_path.is_file():
        raw_tags, raw_keywords = joblib.load(raw_tags_path), joblib.load(raw_keywords_path)
        if len(raw_tags) != len(ids) or len(raw_keywords) != len(ids):
            raise ValueError("Raw metadata dimensions disagree")


def write_manifest(root, generation: str) -> None:
    if not _GEN.fullmatch(generation):
        raise ValueError("Unsafe generation name")
    Path(root, "active_manifest.json").write_text(
        json.dumps({"version": 1, "generation": generation}),
        encoding = "utf-8",
    )