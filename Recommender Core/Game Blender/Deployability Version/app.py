"""Hugging Face Space-compatible application entrypoint."""
from __future__ import annotations

try:
    import spaces
except ImportError:
    class _Spaces:
        @staticmethod
        def GPU(function):
            return function

    spaces = _Spaces()

import gradio as gr

from lifecycle.main import holder, lifespan, router


@spaces.GPU
def zerogpu_warmup():
    return None


app = gr.Server(title = "Game Blender", lifespan = lifespan)
app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok", "model": "ready" if holder.current is not None else "unavailable"}


demo = app

if __name__ == "__main__":
    app.launch(server_name = "0.0.0.0", ssr_mode = False)
