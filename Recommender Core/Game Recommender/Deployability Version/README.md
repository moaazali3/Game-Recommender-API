# Deployment Recommender (Hugging Face Space)

This directory is independent from `Recommender Core`. It runs as a Gradio Server Mode Hugging Face Space with the root `app.py` entrypoint, and stores self-contained model generations in a Hugging Face Hub model repository.

## Space setup

Set these Space secrets/variables; no credentials are committed:

- `HF_TOKEN`: write/read token for the artifact repository.
- `HF_REPO_ID`: `owner/repository` used as persistent storage.
- `HF_REPO_TYPE`: optional, defaults to `model`.
- `DATABASE_URL`: SQLAlchemy URL used by scheduled retraining.
- `MODEL_CACHE_DIR`: optional local cache, defaults to `.model-cache`.
- `LOG_LEVEL`: optional logging level, defaults to `INFO`.

Install `requirements.txt`, then run `python app.py` locally. The Space runtime also starts the root `app.py` entrypoint.

The FastAPI routes remain registered even when credentials, the manifest, or model artifacts are unavailable; requests then receive the existing safe error envelope. When `HF_REPO_ID` is configured, the lifespan loads and validates the active generation from Hub. If no active generation is available and `DATABASE_URL` is present, it starts a background monthly bootstrap. With both Hub and database configuration present, APScheduler starts two process-local jobs: monthly retraining on day 1 at 02:00 and weekly updates on Saturday at 04:00. Shutdown stops the scheduler without waiting for jobs. A successful publication replaces the in-process model holder only after artifact and manifest verification. No real remote Hub verification was performed for this documentation update.

## API

### Existing recommendations

`POST /api/v1/game-details` accepts these request fields:

- `app_id`: integer AppID.
- `top_n`: optional positive integer; the recommender defaults it to `10` when omitted.
- `filters.app_id`: the legacy nested AppID form, used when `app_id` is not provided.

The success response keeps the Core envelope: `{"status":"success","data":{"recommendations":{"total":...,"games":[...]}}}`. Normal recommendation game objects contain `app_id` and `similarity_score`; this endpoint does not return `Tags`.

### Mix recommendations

`POST /api/v1/mix-recommendations` accepts:

```json
{
  "selected_app_ids": [123, 456],
  "top_k": 10,
  "include_tags": false
}
```

- `selected_app_ids`: a list of 2-4 distinct integer AppIDs.
- `top_k`: positive integer, default `10`.
- `include_tags`: boolean, default `false`.

With `include_tags` omitted or `false`, the response data contains `total` and `games`; each candidate contains `app_id` and `similarity_score`. With `include_tags: true`, each candidate also contains `Tags`, and the response data also contains `selected_games`, whose objects contain only `app_id` and `Tags`. The minimal `include_tags: true` response shape is `{ "total": 1, "games": [{ "app_id": 789, "similarity_score": 0.42, "Tags": "action,indie" }], "selected_games": [{ "app_id": 123, "Tags": "action" }, { "app_id": 456, "Tags": "indie" }] }`. Names are not returned.

The Game Recommender owns this pipeline: exclude all selected rows; apply the first-selected-game positive-score filter; build separate union documents for selected `Tags` and selected `Keywords`; transform them with separate vectorizers and compare against their separate matrices; combine scores exactly as `sqrt(TagCosine * KeywordCosine)`; rank by stable descending score; and return up to `top_k` positive-score candidates. If raw tag/keyword metadata is unavailable, `recommend_mix` raises `Raw tag and keyword metadata is unavailable.`

Game Blender consumes this endpoint with `include_tags: true`. It requests `top_k = final K * stage2_multiplier` (defaults: `K = 10`, `stage2_multiplier = 3`, so the default request is `30`), then performs P75 relative-gap grouping, near-tie grouping behavior, Exclusive Tags, and CoverageCount post-processing. Blender does not load recommender artifacts or recalculate MixScore.

## Repository layout, artifacts, and safety

Hub files are `active_manifest.json` and `generation-<uuid>/`. Each generation contains the core artifacts `tag_vectorizer.joblib`, `keyword_vectorizer.joblib`, `app_ids.joblib`, `tag_matrix.npz`, and `keyword_matrix.npz`, plus optional `raw_tags.joblib` and `raw_keywords.joblib`. `build_artifacts` retains raw `Tags` and `keywords`, embeds them on the fitted vectorizers, and can write the two raw metadata files; the tag and keyword vectorizers/matrices remain separate. Existing generations without raw metadata cannot serve mix requests and produce `Raw tag and keyword metadata is unavailable.` from `recommend_mix`.

The manifest is the only active pointer. Publication validates a complete local generation, uploads and reads back every core artifact, updates the manifest last, verifies it, and only then removes generations older than the newest five (never the active one). Any failure before manifest publication leaves the prior active model untouched. The current publication path validates the core artifact set; raw metadata is optional for generation validation but required at mix-request time.

Training uses `SELECT Appid, Tags, keywords FROM games ORDER BY Appid ASC`, comma-to-space text normalization, and the Core's separate char-wb TF-IDF settings. Normal recommendation scoring is `sqrt(tag cosine * keyword cosine)`, excluding the target and filtering zero scores with stable descending ranking; returned normal scores are percentages rounded to two decimals.

`DeploymentScheduler.run_weekly()` and `.run_monthly()` are guarded by a process-local `RLock` and publish through the same safe client. Weekly identity checks canonical integer AppIDs against the database prefix; a mismatch falls back to the monthly rebuild without recursively reacquiring the lock. A missing active manifest or other weekly-read failure can be repaired by monthly retraining. The lock does not coordinate multiple Space workers, and no remote success can be verified without valid Hub credentials and repository access.

The ASP.NET destination is outside this directory and is intentionally not changed. Point an external ASP.NET client/configuration at the Space endpoint if that is the desired deployment destination.

Tests use synthetic data and local fake collaborators only; they do not require HF credentials or a remote repository.
