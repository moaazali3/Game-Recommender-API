"""Centralized, safe logging configuration for Recommender Core."""

from __future__ import annotations

import logging
import os
import sys


def _configured_level() -> int:
    """Return the requested logging level, defaulting safely to INFO."""
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = logging.getLevelNamesMapping().get(level_name, logging.INFO)

    return level if isinstance(level, int) else logging.INFO


def configure_logging() -> logging.Logger:
    """Configure one console handler and return the application logger.

    Configuration is idempotent and keeps third-party libraries quieter than the
    application while preserving normal exception traceback details locally.
    """
    root_logger = logging.getLogger()
    level = _configured_level()
    root_logger.setLevel(level)
    root_logger.propagate = False

    handler = next(
        (item for item in root_logger.handlers if getattr(item, "_recommender_core", False)),
        None,
    )

    if handler is None:
        handler = logging.StreamHandler(sys.stdout)
        handler._recommender_core = True
        root_logger.addHandler(handler)

    handler.setLevel(level)
    handler.setFormatter(
        logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
    )

    for logger_name in ("sqlalchemy", "apscheduler", "uvicorn", "httpx"):
        logging.getLogger(logger_name).setLevel(logging.WARNING)

    return root_logger


configure_logging()
