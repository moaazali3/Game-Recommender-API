"""Centralized safe logging for the Hugging Face deployment."""
from __future__ import annotations
import logging
import os

_CONFIGURED = False

def configure_logging() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return
    level = getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO)
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    _CONFIGURED = True
