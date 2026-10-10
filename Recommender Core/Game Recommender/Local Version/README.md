# Local Recommender

This is an independent, raw local FastAPI project. It preserves the content-based game recommender behavior without hosted-storage or platform assumptions.

## Configuration

Copy the repository-root `.env.example` to `.env` and adjust the values. `.env` is intentionally outside this directory and ignored by Git. Configuration is loaded from the repository root using `python-dotenv`.

- `DATABASE_URL`: SQLAlchemy URL used by scheduled training.
- `MODEL_STORAGE_DIR`: local directory for model generations; relative paths are resolved from the repository root.
- `LOG_LEVEL`: logging level, default `INFO`.
- `API_HOST`: bind host, default `127.0.0.1`.
- `API_PORT`: bind port, default `8000`.

Install dependencies with `pip install -r requirements.txt`, then run `python app.py` or `uvicorn app:app` from this directory.

## API

`GET /health` reports application status.

### Existing recommendations

`POST /api/v1/game-details` accepts these request fields:

- `app_id`: integer AppID.
- `top_n`: optional positive integer; the recommender defaults it to `10` when omitted.
- `filters.app_id`: the legacy nested AppID form, used when `app_id` is not provided.

The success response keeps the existing envelope: `{"status":"success","data":{"recommendations":{"total":...,"games":[...]}}}`. Normal recommendation game objects contain `app_id` and `similarity_score`; this endpoint does not return `Tags`.

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

## Local artifacts and scheduling

`build_artifacts` retains the raw `Tags` and `keywords` metadata, embeds those values on the fitted vectorizers, and can write `raw_tags.joblib` and `raw_keywords.joblib`. The core artifacts remain separate: `tag_vectorizer.joblib`, `keyword_vectorizer.joblib`, integer `app_ids.joblib`, `tag_matrix.npz`, and `keyword_matrix.npz`. Existing generations without raw metadata cannot serve mix requests and produce the runtime error above from `recommend_mix`.

Each complete generation is stored under `generation-<id>/`, and local storage contains an `active_manifest.json` pointer. Publication validates all artifacts, stages and finalizes a generation, then replaces the manifest last and reads it back. A failed publication restores the previous pointer. Cleanup keeps the active generation and the five newest complete generations; incomplete or malformed directories are not deleted by retention.

The scheduler uses a process-local lock, monthly retraining on day 1 at 02:00, and weekly updates on Saturday at 04:00. Weekly updates compare the stored ordered AppID sequence with the database prefix and fall back to a monthly rebuild on mismatch or read failure. If no active generation exists and `DATABASE_URL` is configured, startup begins a background monthly bootstrap.
