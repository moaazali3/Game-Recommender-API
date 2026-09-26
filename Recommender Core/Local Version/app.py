"""Local FastAPI application and command-line entrypoint."""
from __future__ import annotations

import logging

from fastapi import FastAPI

from infrastructure.config import Settings
from lifecycle.main import holder, lifespan, router

logger = logging.getLogger(__name__)
app = FastAPI(title = "Game Recommender", lifespan = lifespan)
app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok", "model": "ready" if holder.current is not None else "unavailable"}


if __name__ == "__main__":
    import uvicorn

    settings = Settings.from_env()
    uvicorn.run(app, host = settings.api_host, port = settings.api_port)
