# Deployment Recommender (Hugging Face Space)

This directory is independent from `Recommender Core`. It runs as a Gradio Server Mode Hugging Face Space with the root `app.py` entrypoint, and stores self-contained model generations in a Hugging Face Hub model repository.

## Space setup

Set these Space secrets/variables; no credentials are committed:

- `HF_TOKEN`: write/read token for the artifact repository
- `HF_REPO_ID`: `owner/repository` used as persistent storage
- `HF_REPO_TYPE`: optional, defaults to `model`
- `DATABASE_URL`: SQLAlchemy URL used by scheduled retraining
- `MODEL_CACHE_DIR`: optional local cache, defaults to `.model-cache`
- `LOG_LEVEL`: optional logging level, defaults to `INFO`

Install `requirements.txt`, then run `python app.py` locally. The Space runtime also starts the root `app.py` entrypoint.

The FastAPI lifespan loads settings and, when Hub configuration is present, downloads and validates the active generation. The route remains registered even if credentials, the manifest, or model artifacts are unavailable; in that case it returns the existing safe error envelope. With both Hub and database configuration present, APScheduler starts two process-local jobs: monthly retraining on day 1 at 02:00 and weekly updates on Saturday at 04:00. Shutdown stops the scheduler without waiting for jobs. A successful publication replaces the in-process model holder only after artifact and manifest verification.

The endpoint is `POST /api/v1/game-details` with `{"app_id": 123, "top_n": 10}`. Legacy `{"filters":{"app_id":123}}` is accepted. Responses preserve the Core envelope: `status`, `data.recommendations`, then `total` and `games`; scores are percentages rounded to two decimals.

## Repository layout and safety

Hub files are `active_manifest.json` and `generation-<uuid>/` containing `tag_vectorizer.joblib`, `keyword_vectorizer.joblib`, `app_ids.joblib`, `tag_matrix.npz`, and `keyword_matrix.npz`. The manifest is the only active pointer. Publication validates a complete local generation, uploads and reads back every artifact, updates the manifest last, verifies it, and only then removes generations older than the newest five (never the active one). Any failure before manifest publication leaves the prior active model untouched.

Training uses `SELECT Appid, Tags, keywords FROM games ORDER BY Appid ASC`, comma-to-space text normalization, and the Core's separate char-wb TF-IDF settings. Recommendation scoring is `sqrt(tag cosine * keyword cosine)`, excluding the target and filtering zero scores with stable descending ranking.

`DeploymentScheduler.run_weekly()` and `.run_monthly()` are guarded by a process-local `RLock` and publish through the same safe client. Weekly identity checks canonical integer AppIDs against the database prefix; a mismatch falls back to the monthly rebuild without recursively reacquiring the lock. A missing active manifest or other weekly-read failure can be repaired by monthly retraining. The lock does not coordinate multiple Space workers, and no remote success can be verified without valid Hub credentials and repository access.

The ASP.NET destination is outside this directory and is intentionally not changed. Point an external ASP.NET client/configuration at the Space endpoint if that is the desired deployment destination.

Tests use synthetic data and local fake collaborators only; they do not require HF credentials or a remote repository.
