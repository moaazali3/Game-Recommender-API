import importlib


def test_settings_load_dotenv_from_repository_root(monkeypatch, tmp_path):
    import infrastructure.config as config

    monkeypatch.setattr(config, "REPOSITORY_ROOT", tmp_path)
    (tmp_path / ".env").write_text(
        "DATABASE_URL=sqlite:///root.db\nMODEL_STORAGE_DIR=root-models\nAPI_PORT=8123\n",
        encoding = "utf-8",
    )
    monkeypatch.delenv("DATABASE_URL", raising = False)
    monkeypatch.delenv("MODEL_STORAGE_DIR", raising = False)
    monkeypatch.delenv("API_PORT", raising = False)
    config.load_dotenv(tmp_path / ".env", override = True)
    settings = config.Settings.from_env()
    assert settings.database_url == "sqlite:///root.db"
    assert settings.model_storage_dir == tmp_path / "root-models"
    assert settings.api_port == 8123
