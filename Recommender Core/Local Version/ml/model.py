"""Model training and artifact validation, independent of Recommender Core."""
from __future__ import annotations
import json, os, re, tempfile, uuid
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any
import joblib
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix, save_npz
from sklearn.feature_extraction.text import TfidfVectorizer

FILES = ("tag_vectorizer.joblib", "keyword_vectorizer.joblib", "app_ids.joblib", "tag_matrix.npz", "keyword_matrix.npz")
_GEN = re.compile(r"^generation-[0-9a-f]{16}-[a-f0-9]{32}$")

def validate_app_ids(values: Any, source: str, allow_numeric_strings: bool = False) -> list[int]:
    try: values = list(values)
    except TypeError as exc: raise ValueError(f"AppIDs from {source} must be iterable") from exc
    result = []
    for i, value in enumerate(values):
        if isinstance(value, bool) or value is None or (isinstance(value, (float, np.floating)) and not np.isfinite(value)):
            raise ValueError(f"Invalid AppID at {source}[{i}]")
        if isinstance(value, str):
            if not allow_numeric_strings: raise ValueError(f"Invalid AppID at {source}[{i}]: strings are not allowed")
            try: value = Decimal(value.strip())
            except (InvalidOperation, ValueError): raise ValueError(f"Invalid AppID at {source}[{i}]")
        try:
            finite = value.is_finite() if isinstance(value, Decimal) else np.isfinite(value)
            if not finite or value != int(value): raise ValueError
            value = int(value)
        except (TypeError, ValueError, OverflowError): raise ValueError(f"Invalid AppID at {source}[{i}]")
        if not 0 <= value <= (1 << 63) - 1: raise ValueError(f"Invalid AppID at {source}[{i}]")
        result.append(value)
    return result

def preprocess(data: pd.DataFrame) -> pd.DataFrame:
    required = {"Appid", "Tags", "keywords"}
    missing = required - set(data.columns)
    if missing: raise KeyError(f"Missing model columns: {sorted(missing)}")
    result = data.copy()
    result["Appid"] = validate_app_ids(result["Appid"].tolist(), "database", True)
    for col in ("Tags", "keywords"):
        result[col] = result[col].fillna("").astype(str).str.replace(",", " ", regex = False)
    return result

def load_games(engine) -> pd.DataFrame:
    return preprocess(pd.read_sql("SELECT Appid, Tags, keywords FROM games ORDER BY Appid ASC", engine))

def build_artifacts(data: pd.DataFrame):
    data = preprocess(data)
    tags = TfidfVectorizer(analyzer = "char_wb", ngram_range = (3, 5), sublinear_tf = True, max_features = 50000, norm = "l2")
    keywords = TfidfVectorizer(analyzer = "char_wb", ngram_range = (2, 4), sublinear_tf = True, max_features = 50000, norm = "l2")
    return tags, keywords, tags.fit_transform(data.Tags).tocsr(), keywords.fit_transform(data.keywords).tocsr(), np.asarray(data.Appid, dtype = np.int64)

def write_generation(artifacts, root: str | os.PathLike[str]) -> str:
    root = Path(root); root.mkdir(parents = True, exist_ok = True)
    name = f"generation-{__import__('time').time_ns():016x}-{uuid.uuid4().hex}"; tmp = Path(tempfile.mkdtemp(prefix = ".generation-", dir = root)); final = root / name
    try:
        tag, key, tag_matrix, key_matrix, ids = artifacts
        joblib.dump(tag, tmp / FILES[0]); joblib.dump(key, tmp / FILES[1]); joblib.dump(ids, tmp / FILES[2])
        save_npz(tmp / FILES[3], tag_matrix); save_npz(tmp / FILES[4], key_matrix)
        validate_generation(tmp)
        os.replace(tmp, final)
        return name
    finally:
        if tmp.exists():
            for p in tmp.iterdir(): p.unlink()
            tmp.rmdir()

def validate_generation(path: str | os.PathLike[str]) -> None:
    from scipy.sparse import load_npz
    path = Path(path)
    if path.name.startswith("generation-") and not _GEN.fullmatch(path.name): raise ValueError("Unsafe generation name")
    missing = [f for f in FILES if not (path / f).is_file()]
    if missing: raise ValueError(f"Missing artifacts: {missing}")
    ids = joblib.load(path / "app_ids.joblib")
    if not isinstance(ids, np.ndarray) or ids.ndim != 1 or ids.dtype.kind not in "iu": raise ValueError("AppID artifact must be a 1D integer NumPy array")
    canonical = validate_app_ids(ids.tolist(), "model artifact")
    if len(set(canonical)) != len(canonical): raise ValueError("Duplicate AppIDs")
    tag, key = joblib.load(path / FILES[0]), joblib.load(path / FILES[1])
    tm, km = load_npz(path / FILES[3]), load_npz(path / FILES[4])
    if tm.shape[0] != len(ids) or km.shape[0] != len(ids) or tm.shape[1] != len(getattr(tag, "vocabulary_", {})) or km.shape[1] != len(getattr(key, "vocabulary_", {})): raise ValueError("Artifact dimensions disagree")

def write_manifest(root, generation: str) -> None:
    if not _GEN.fullmatch(generation): raise ValueError("Unsafe generation name")
    Path(root, "active_manifest.json").write_text(json.dumps({"version": 1, "generation": generation}), encoding = "utf-8")
