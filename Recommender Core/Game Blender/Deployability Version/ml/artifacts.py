"""Adapters for the established Game Recommender artifact format."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from scipy.sparse import load_npz


ARTIFACT_FILES = (
    "tag_vectorizer.joblib",
    "keyword_vectorizer.joblib",
    "app_ids.joblib",
    "tag_matrix.npz",
    "keyword_matrix.npz",
)


@dataclass(frozen = True)
class ArtifactBundle:
    app_ids: np.ndarray
    tag_vectorizer: Any
    keyword_vectorizer: Any
    tag_matrix: Any
    keyword_matrix: Any
    catalog: pd.DataFrame


def _canonical_app_id(value: Any, source: str) -> int:
    if isinstance(value, bool) or value is None:
        raise ValueError(f"Invalid AppID in {source}")
    try:
        number = int(value)
    except (TypeError, ValueError, OverflowError) as exc:
        raise ValueError(f"Invalid AppID in {source}") from exc
    if str(value).strip() != str(number) and not isinstance(value, (int, np.integer)):
        raise ValueError(f"Invalid AppID in {source}")
    if number < 0:
        raise ValueError(f"Invalid AppID in {source}")
    return number


def load_catalog(path: str | Path) -> pd.DataFrame:
    """Load and validate the raw catalog required by Blender."""
    path = Path(path)
    if not path.is_file():
        raise FileNotFoundError(f"Catalog not found: {path}")
    if path.suffix.lower() == ".json":
        payload = json.loads(path.read_text(encoding = "utf-8"))
        data = pd.DataFrame(payload)
    else:
        data = pd.read_csv(path)
    required = {"Appid", "Name", "Tags", "keywords"}
    missing = required - set(data.columns)
    if missing:
        raise KeyError(f"Catalog missing columns: {sorted(missing)}")
    result = data.loc[:, ["Appid", "Name", "Tags", "keywords"]].copy()
    result["Appid"] = [_canonical_app_id(value, str(path)) for value in result["Appid"]]
    if result["Appid"].duplicated().any():
        raise ValueError("Catalog contains duplicate AppIDs")
    for column in ("Name", "Tags", "keywords"):
        result[column] = result[column].fillna("").astype(str)
    return result.reset_index(drop = True)


def load_bundle(model_dir: str | Path, catalog_path: str | Path | None = None) -> ArtifactBundle:
    """Load fitted vectors/matrices plus a configured or self-contained catalog."""
    model_dir = Path(model_dir)
    missing = [name for name in ARTIFACT_FILES if not (model_dir / name).is_file()]
    if missing:
        raise FileNotFoundError(f"Missing model artifacts: {missing}")
    if catalog_path is None:
        candidates = [model_dir / "catalog.json", model_dir / "catalog.csv"]
        catalog_path = next((path for path in candidates if path.is_file()), None)
    if catalog_path is None:
        raise FileNotFoundError("A catalog path or self-contained catalog artifact is required")

    app_ids = joblib.load(model_dir / "app_ids.joblib")
    if not isinstance(app_ids, np.ndarray) or app_ids.ndim != 1:
        raise ValueError("AppID artifact must be a one-dimensional NumPy array")
    canonical_ids = [_canonical_app_id(value, "model artifact") for value in app_ids.tolist()]
    if len(set(canonical_ids)) != len(canonical_ids):
        raise ValueError("Model artifact contains duplicate AppIDs")
    catalog = load_catalog(catalog_path)
    if set(canonical_ids) != set(catalog["Appid"]):
        raise ValueError("Catalog AppIDs must match model AppIDs")

    tag_vectorizer = joblib.load(model_dir / "tag_vectorizer.joblib")
    keyword_vectorizer = joblib.load(model_dir / "keyword_vectorizer.joblib")
    tag_matrix = load_npz(model_dir / "tag_matrix.npz").tocsr()
    keyword_matrix = load_npz(model_dir / "keyword_matrix.npz").tocsr()
    if tag_matrix.shape[0] != len(canonical_ids) or keyword_matrix.shape[0] != len(canonical_ids):
        raise ValueError("Model matrices must have one row per AppID")
    return ArtifactBundle(
        app_ids = np.asarray(canonical_ids, dtype = np.int64),
        tag_vectorizer = tag_vectorizer,
        keyword_vectorizer = keyword_vectorizer,
        tag_matrix = tag_matrix,
        keyword_matrix = keyword_matrix,
        catalog = catalog,
    )
