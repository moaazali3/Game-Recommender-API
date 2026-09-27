import asyncio
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import pytest

from api.routes import PageRequest, make_router
from infrastructure.storage import LocalStorage
from ml.model import FILES, build_artifacts, validate_generation, write_generation
from ml.recommender import GameRecommender

DATA = pd.DataFrame({"Appid": [10, 20, 30], "Tags": ["action,indie", "action,indie", "puzzle"], "keywords": ["space,coop", "space,coop", "logic"]})


def test_build_write_load_and_core_ranking(tmp_path):
    generation = write_generation(build_artifacts(DATA), tmp_path)
    storage = LocalStorage(tmp_path)
    storage.publish(tmp_path / generation, generation)
    model = GameRecommender(tmp_path, generation)
    result = model.recommend(10, 2)
    assert result["games"][0]["app_id"] == 20
    assert result["games"][0]["similarity_score"] == 100.0
    assert all(item["app_id"] != 10 for item in result["games"])


def test_validation_rejects_object_ids_and_duplicate_ids(tmp_path):
    generation = write_generation(build_artifacts(DATA), tmp_path)
    ids_path = tmp_path / generation / "app_ids.joblib"
    joblib.dump(np.array(["10", "20", "30"], dtype = object), ids_path)
    with pytest.raises(ValueError, match = "1D integer"):
        validate_generation(tmp_path / generation)


def test_publication_failure_does_not_change_previous_pointer(tmp_path, monkeypatch):
    generation = write_generation(build_artifacts(DATA), tmp_path)
    storage = LocalStorage(tmp_path)
    storage.publish(tmp_path / generation, generation)
    old = (tmp_path / "active_manifest.json").read_bytes()
    monkeypatch.setattr(storage, "active_generation", lambda: (_ for _ in ()).throw(RuntimeError("injected")))
    with pytest.raises(RuntimeError, match = "injected"):
        storage.publish(tmp_path / generation, generation)
    assert (tmp_path / "active_manifest.json").read_bytes() == old


def test_cleanup_retains_active_and_five_complete_generations(tmp_path):
    storage = LocalStorage(tmp_path)
    names = []
    for index in range(1, 8):
        generation = write_generation(build_artifacts(DATA), tmp_path)
        renamed = tmp_path / f"generation-{index:016x}-{'a' * 32}"
        (tmp_path / generation).rename(renamed)
        names.append(renamed.name)
    storage.cleanup(names[0], keep = 5)
    assert names[0] in {path.name for path in tmp_path.iterdir()}
    remaining = {path.name for path in tmp_path.iterdir() if path.is_dir() and path.name.startswith("generation-")}
    assert len(remaining) == 6


def test_route_returns_safe_error_when_model_is_unavailable():
    route = make_router(type("Holder", (), {"current": None})())
    response = asyncio.run(route.routes[0].endpoint(PageRequest(app_id = 10)))
    assert response["status"] == "error"
    assert response["details"]["path"] == "/api/v1/game-details"
