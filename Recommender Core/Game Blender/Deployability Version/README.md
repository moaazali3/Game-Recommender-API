# Game Blender — Deployability Version

HTTP-only Game Blender service. It delegates candidate generation and filtering to the Game Recommender API, then performs runtime gap grouping and exclusive-tag coverage ordering. It does not load local model artifacts or catalogs.

## Run tests

```bash
pytest -q
```

## Configuration

- `GAME_RECOMMENDER_URL`: base URL of the Game Recommender API, default `http://127.0.0.1:8001`.
- `GAME_RECOMMENDER_TOKEN`: optional bearer token sent to the Game Recommender API.
- `BLENDER_TOP_K`: positive integer, default `10`.
- `BLENDER_STAGE2_MULTIPLIER`: positive integer, default `3`.
