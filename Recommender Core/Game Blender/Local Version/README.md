# Game Blender — Local Version

HTTP-only Game Blender service. It calls the Game Recommender API for candidates and selected-game tags, then performs runtime gap grouping and exclusive-tag coverage ordering. It does not load local model artifacts or catalogs.

## Run tests

```bash
pytest -q
```

## Endpoint

`POST /api/v1/game-blender`

Request:

```json
{"selected_app_ids": [1, 2], "top_k": 2, "stage2_multiplier": 3}
```

Response:

```json
{"status": "success", "data": {"recommendations": {"total": 2, "games": [{"app_id": 101, "similarity_score": 92.5}, {"app_id": 205, "similarity_score": 87.13}]}}}
```

The Blender response converts upstream `similarity_score` values from 0–1 to percentages at the response boundary and rounds them to two decimals. The final game objects contain only `app_id` and `similarity_score`.

## Configuration

- `GAME_RECOMMENDER_URL`: base URL of the Game Recommender API, default `http://127.0.0.1:8001`.
- `GAME_RECOMMENDER_TOKEN`: optional bearer token sent to the Game Recommender API.
- `BLENDER_TOP_K`: positive integer, default `10`.
- `BLENDER_STAGE2_MULTIPLIER`: positive integer, default `3`.
