from __future__ import annotations

from pathlib import Path

import pytest

from ml.blender import GameBlender, GameRecommenderClient, P75_DEFINITION


def response_payload():
    return {
        "selected_games": [
            {"app_id": 1, "Tags": "Alpha, Shared"},
            {"app_id": 2, "Tags": "Beta, Shared"},
        ],
        "games": [
            {"app_id": 101, "similarity_score": 1.0, "Tags": "Other"},
            {"app_id": 102, "similarity_score": 0.9, "Tags": "Alpha"},
            {"app_id": 103, "similarity_score": 0.8, "Tags": "Beta"},
            {"app_id": 104, "similarity_score": 0.7, "Tags": "Alpha, Beta"},
            {"app_id": 105, "similarity_score": 0.6, "Tags": "Other"},
            {"app_id": 106, "similarity_score": 0.5, "Tags": "Beta"},
        ],
    }


class FakeClient:
    def __init__(self, payload):
        self.payload = payload
        self.calls = []

    def recommend(self, selected_app_ids, top_k, include_tags):
        self.calls.append((selected_app_ids, top_k, include_tags))
        return self.payload


def test_requests_k_times_multiplier_and_uses_all_returned_candidates(monkeypatch):
    client = FakeClient(response_payload())
    blender = GameBlender(client)
    seen_scores = []
    original = GameBlender.group_candidates

    def spy(cls, scores, definition = P75_DEFINITION):
        values = list(scores)
        seen_scores.append(values)
        return original(values, definition)

    monkeypatch.setattr(GameBlender, "group_candidates", classmethod(spy))
    result = blender.recommend([1, 2], top_k = 2, stage2_multiplier = 2)
    assert client.calls == [([1, 2], 4, True)]
    assert seen_scores == [[1.0, 0.9, 0.8, 0.7, 0.6, 0.5]]
    assert len(result) == 2
    assert all(isinstance(app_id, int) for app_id in result)


def test_pipeline_reorders_full_pool_once_and_returns_app_ids_only(monkeypatch):
    payload = {
        "selected_games": [
            {"app_id": 1, "Tags": "Alpha"},
            {"app_id": 2, "Tags": "Beta"},
        ],
        "games": [
            {"app_id": 101, "similarity_score": 1.0, "Tags": "Other"},
            {"app_id": 102, "similarity_score": 0.5, "Tags": "Other"},
            {"app_id": 103, "similarity_score": 0.49, "Tags": "Alpha"},
            {"app_id": 104, "similarity_score": 0.48, "Tags": "Beta"},
        ],
    }
    client = FakeClient(payload)
    seen_pool = []
    original = GameBlender._reorder_within_groups

    def spy(candidates, groups):
        seen_pool.append([candidate["app_id"] for candidate in candidates])
        return original(candidates, groups)

    monkeypatch.setattr(GameBlender, "_reorder_within_groups", staticmethod(spy))

    result = GameBlender(client).recommend([1, 2], top_k = 2, stage2_multiplier = 2)

    assert client.calls == [([1, 2], 4, True)]
    assert seen_pool == [[101, 102, 103, 104]]
    assert result == [101, 103]
    assert all(type(app_id) is int for app_id in result)


def test_coverage_reorders_only_inside_groups_and_keeps_ties_stable():
    rows = [
        {"app_id": 1, "coverage_count": 0},
        {"app_id": 2, "coverage_count": 2},
        {"app_id": 3, "coverage_count": 1},
        {"app_id": 4, "coverage_count": 1},
    ]
    groups = [type("Group", (), {"start": 0, "end": 1})(), type("Group", (), {"start": 2, "end": 3})()]
    reordered = GameBlender._reorder_within_groups(rows, groups)
    assert [row["app_id"] for row in reordered] == [2, 1, 3, 4]


def test_strict_relative_gap_rule_and_runtime_p75():
    groups, tau, gaps = GameBlender.group_candidates([1.0, 0.5])
    assert tau == pytest.approx(0.5)
    assert gaps == pytest.approx([0.5])
    assert [(group.start, group.end) for group in groups] == [(0, 1)]
    with pytest.raises(ValueError, match = "unsupported gap definition"):
        GameBlender.derive_p75_relative_gap([1.0, 0.5], "p90_relative_gap")


def test_p75_is_interpolated_over_sorted_gap_distribution():
    scores = [1.0, 0.5, 0.49, 0.48]
    gaps = GameBlender.adjacent_relative_gaps(scores)

    assert gaps == pytest.approx([0.5, 0.02, 0.02040816326530612])
    assert GameBlender.derive_p75_relative_gap(scores) == pytest.approx(0.26020408163265306)
    groups, tau, _ = GameBlender.group_candidates(scores)
    assert tau == pytest.approx(0.26020408163265306)
    assert [(group.start, group.end) for group in groups] == [(0, 0), (1, 3)]


def test_invalid_http_response_is_clear():
    class Response:
        status = 200

        @staticmethod
        def read():
            return b"not-json"

    client = GameRecommenderClient("http://recommender", opener = lambda request, timeout: Response())
    with pytest.raises(RuntimeError, match = "invalid JSON"):
        client.recommend([1, 2], 30, True)


def test_blender_has_no_recommendation_artifact_or_score_engine_path():
    source = (Path(__file__).resolve().parents[1] / "ml" / "blender.py").read_text(encoding = "utf-8").lower()
    for forbidden in ("joblib", "sklearn", "pandas", "scipy", "catalog", "database_url", "mix_score"):
        assert forbidden not in source
