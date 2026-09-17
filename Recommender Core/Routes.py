"""Small request and routing abstractions used by the FastAPI application."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

try:
    from .Services import PageBuilder
    from .logging_utils import configure_logging
except ImportError:
    from Services import PageBuilder
    from logging_utils import configure_logging

configure_logging()
logger = logging.getLogger(__name__)


class PageRequest(BaseModel):
    """Request payload shared by dynamic page endpoints.

    The primary recommendation request is ``{"app_id": 123, "top_n": 10}``.
    Legacy nested filters and the remaining page options are still supported.
    """

    model_config = ConfigDict(
        json_schema_extra = {
            "examples": [{"app_id": 123, "top_n": 10}],
        },
    )

    app_id: int | None = Field(
        default = None,
        description = "Application ID to use for recommendations.",
    )
    filters: dict[str, Any] = Field(default_factory = dict)
    rules: list[dict[str, Any]] = Field(default_factory = list)
    top_n: int | None = None
    orient: str = "records"
    frontend_kwargs: dict[str, Any] = Field(default_factory = dict)


class DynamicPageRouter:
    """Register a POST-style endpoint backed by a :class:`PageBuilder`."""

    def __init__(self, path: str, builder: PageBuilder, methods: list[str] | None = None) -> None:
        """Initialize the route and retain its builder and path configuration."""
        self.router = APIRouter()
        self.builder = builder
        self.path = path
        self.router.add_api_route(path, self.handle_request, methods = methods or ["POST"])

    async def handle_request(self, request: PageRequest | None = None) -> dict[str, Any]:
        """Build a page response and return a safe error envelope on failure."""
        actual_request = request or PageRequest()

        try:
            logger.info("component=api operation=request stage=start path=%s next_action=build_page", self.path)
            return {"status": "success", "data": self.builder.build(actual_request)}

        except Exception:
            logger.exception("component=api operation=request stage=build failure=api next_action=return_safe_error path=%s", self.path)

            return {
                "status": "error", "data": {},
                "error": "An internal error occurred while building the page. Please contact support.",
                "details": {"path": self.path},
            }
