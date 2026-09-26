"""Centralized, idempotent logging configuration."""
from __future__ import annotations

import logging
import os


def configure_logging(level: str | None = None) -> None:
    selected = (level or os.getenv("LOG_LEVEL", "INFO")).upper()
    numeric = getattr(logging, selected, logging.INFO)
    root = logging.getLogger()
    root.setLevel(numeric)
    if not root.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
        root.addHandler(handler)
