# Game Blender — Deployability Version

Hugging Face-oriented production packaging for Game Blender. Importing the package does not require credentials or network access.

The deployed artifact directory contains the established vectorizers, sparse matrices, AppIDs, and a self-contained `catalog.json` or `catalog.csv`; a configured catalog source may also be supplied. `HubStorage` downloads lazily only when explicitly asked to load a remote generation.

## Run tests

```bash
pytest -q
```

## Configuration

- `MODEL_CACHE_DIR`: local artifact cache, default `.model-cache`.
- `HF_REPO_ID`: optional repository identifier, required only for explicit Hub access.
- `HF_TOKEN`: optional token, never needed for import/tests.
- `CATALOG_PATH`: optional configured catalog source.
- `BLENDER_TOP_K`: positive integer, default `10`.
- `BLENDER_STAGE2_MULTIPLIER`: positive integer, default `3`.
