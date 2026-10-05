from __future__ import annotations

from infrastructure.config import Settings
from infrastructure.storage import HubStorage


def test_deployability_settings_need_no_credentials(monkeypatch):
    monkeypatch.delenv("HF_REPO_ID", raising = False)
    monkeypatch.delenv("HF_TOKEN", raising = False)
    settings = Settings.from_env()
    assert settings.hf_repo_id is None
    assert settings.hf_token is None


def test_hub_storage_does_not_network_on_construction(tmp_path):
    storage = HubStorage(None, cache_dir = tmp_path)
    assert storage.repo_id is None
    assert storage.cache_dir == tmp_path
