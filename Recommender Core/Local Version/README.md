# Local Recommender

This is an independent, raw local FastAPI project. It preserves the content-based game recommender behavior without hosted-storage or platform assumptions.

## Configuration

Copy the repository-root `.env.example` to `.env` and adjust the values. `.env` is intentionally outside this directory and ignored by Git. Configuration is loaded from the repository root using `python-dotenv`.

- `DATABASE_URL`: SQLAlchemy URL used by scheduled training.
- `MODEL_STORAGE_DIR`: local directory for model generations.
- `LOG_LEVEL`: logging level, default `INFO`.
- `API_HOST`: bind host, default `127.0.0.1`.
- `API_PORT`: bind port, default `8000`.

Install dependencies with `pip install -r requirements.txt`, then run `python app.py` or `uvicorn app:app` from this directory.

## API

`GET /health` reports application status. `POST /api/v1/game-details` accepts `{"app_id": 123, "top_n": 10}` and the legacy `{"filters":{"app_id":123}}` form. Responses retain the existing `status`, `data.recommendations`, `total`, and `games` envelope.

## Local artifacts

Each complete generation contains the two vectorizers, integer AppIDs, and two sparse matrices. The local storage directory contains `generation-<id>/` directories and an `active_manifest.json` pointer. Publication validates all artifacts, stages and finalizes a generation, then replaces the manifest last and reads it back. A failed publication restores the previous pointer. Cleanup keeps the active generation and the five newest complete generations; incomplete or malformed directories are not deleted by retention.

The scheduler uses a process-local lock, monthly retraining on day 1 at 02:00, and weekly updates on Saturday at 04:00. Weekly updates compare the stored ordered AppID sequence with the database prefix and fall back to a monthly rebuild on mismatch or read failure.
