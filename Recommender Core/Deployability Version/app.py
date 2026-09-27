import logging
import os

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

logger = logging.getLogger(__name__)


@spaces.GPU
def zerogpu_warmup():
    """ZeroGPU compatibility hook; recommender inference stays on CPU."""
    return None


app = gr.Server(
    title="Game Recommender",
    lifespan=lifespan,
)

app.include_router(router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "ready" if holder.current is not None else "unavailable",
    }


demo = app


if __name__ == "__main__":
    logger.info(
        "component=server operation=start status=starting "
        "server=gradio.Server"
    )

    app.launch(
        server_name="0.0.0.0",
        ssr_mode=False,
    )