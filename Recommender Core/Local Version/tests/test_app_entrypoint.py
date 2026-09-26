import importlib


def test_fastapi_entrypoint_has_required_routes():
    module = importlib.import_module("app")
    paths = {route.path for route in module.app.routes}
    assert "/health" in paths
    assert "/api/v1/game-details" in paths


def test_health_reports_unavailable_without_model():
    module = importlib.import_module("app")
    assert module.health() == {"status": "ok", "model": "unavailable"}
