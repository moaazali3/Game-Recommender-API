"""Page-building services used by the API layer."""

from __future__ import annotations

import logging
from typing import Any, Callable, Mapping

try:
    from .logging_utils import configure_logging
except ImportError:
    from logging_utils import configure_logging

configure_logging()
logger = logging.getLogger(__name__)


class PageBuilder:
    """Execute configured section resolvers and aggregate their results."""

    def __init__(self, page_config: Mapping[str, Callable[[Any], Any]]) -> None:
        """Store the mapping of response keys to resolver callables."""
        self.page_config = dict(page_config)

    def build(self, request_data: Any) -> dict[str, Any]:
        """Build every configured section while isolating section failures."""
        result: dict[str, Any] = {}

        for key, func in self.page_config.items():
            if not callable(func):
                logger.error("component=service operation=build stage=validation failure=non_callable_resolver key=%r next_action=fix page configuration", key)
                result[key] = {"error": "Configured value is not callable."}

                continue

            try:
                result[key] = func(request_data)
            except Exception:
                logger.exception("component=service operation=widget stage=execute failure=api key=%r next_action=return widget error", key)
                result[key] = {"error": "Failed to load this widget.", "key": key}

        return result
