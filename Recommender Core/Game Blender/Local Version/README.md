# Game Blender — Local Version

Production implementation of multi-game blending on top of the established Game Recommender artifacts.

The local loader reads the fitted vectorizers, sparse matrices, and AppIDs from a model generation and reads `Appid`, `Name`, `Tags`, and `keywords` from a configured catalog CSV. It does not import or depend on the LAB modules.

## Run tests

```bash
pytest -q
```

## Configuration

- `MODEL_STORAGE_DIR`: artifact directory; defaults to `.model-storage` next to this version.
- `CATALOG_PATH`: catalog CSV path. A catalog is required because the established recommender artifacts do not contain raw tags or keywords.
- `BLENDER_TOP_K`: positive integer, default `10`.
- `BLENDER_STAGE2_MULTIPLIER`: positive integer, default `3`.
