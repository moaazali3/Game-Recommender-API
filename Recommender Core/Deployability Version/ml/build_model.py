"""CLI-friendly training entry points for the deployment Space."""
from __future__ import annotations
from infrastructure.config import Settings
from .model import *

def train_and_save(engine, model_dir = ".model-cache") -> str:
    return write_generation(build_artifacts(load_games(engine)), model_dir)

def train_from_database(database_url: str, model_dir = ".model-cache") -> str:
    from sqlalchemy import create_engine
    return train_and_save(create_engine(database_url, pool_pre_ping = True), model_dir)
