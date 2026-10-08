"""Local FastAPI application."""
from __future__ import annotations

from fastapi import FastAPI

from lifecycle.main import holder, lifespan, router


app = FastAPI(title = "Game Blender", lifespan = lifespan)
app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok", "model": "ready" if holder.current is not None else "unavailable"}


if __name__ == "__main__":
    import uvicorn
    from infrastructure.config import Settings

    settings = Settings.from_env()
    uvicorn.run(app, host = settings.api_host, port = settings.api_port)
