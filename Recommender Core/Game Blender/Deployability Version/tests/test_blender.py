from __future__ import annotations

import numpy as np
import pandas as pd
import pytest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from ml.artifacts import ArtifactBundle
from ml.blender import GameBlender, P75_DEFINITION


@pytest.fixture
def blender():
    rows = [
        (1, "Selected One", "Alpha, Shared", "hero, one"),
        (2, "Selected Two", "Beta, Shared", "hero, two"),
        (3, "Selected Three", "Gamma, Shared", "hero, three"),
        (4, "Selected Four", "Delta, Solo", "hero, four"),
        (5, "Covers 1 2 4", "Alpha, Beta, Delta", "hero"),
        (6, "Covers 2", "Shared, Beta", "hero"),
        (7, "Covers 3", "Gamma", "hero"),
        (8, "Covers 4", "Solo", "hero"),
        (9, "Covers none", "Other", "hero"),
        (10, "Covers all", "Alpha, Beta, Gamma, Delta", "hero"),
    ]
    rows.extend((index, f"Extra {index}", "Alpha", "hero") for index in range(11, 46))
    rows.append((46, "Zero", "", ""))
    catalog = pd.DataFrame(rows, columns = ["Appid", "Name", "Tags", "keywords"])
    tag_vectorizer = TfidfVectorizer(
        analyzer = "char_wb", ngram_range = (3, 5), sublinear_tf = True,
        max_features = 50000, norm = "l2",
    )
    keyword_vectorizer = TfidfVectorizer(
        analyzer = "char_wb", ngram_range = (2, 4), sublinear_tf = True,
        max_features = 50000, norm = "l2",
    )
    tag_matrix = tag_vectorizer.fit_transform(catalog["Tags"].str.replace(",", " ", regex = False)).tocsr()
    keyword_matrix = keyword_vectorizer.fit_transform(catalog["keywords"].str.replace(",", " ", regex = False)).tocsr()
    bundle = ArtifactBundle(
        app_ids = catalog["Appid"].to_numpy(dtype = np.int64),
        tag_vectorizer = tag_vectorizer,
        keyword_vectorizer = keyword_vectorizer,
        tag_matrix = tag_matrix,
        keyword_matrix = keyword_matrix,
        catalog = catalog,
    )
    return GameBlender(bundle)


def test_pipeline_excludes_selected_and_zero_score_candidates(blender):
    result = blender.recommend([1, 2], top_k = 10, stage2_multiplier = 3)
    candidate_ids = [row["app_id"] for row in result["candidates"]]
    assert 1 not in candidate_ids and 2 not in candidate_ids
    assert 46 not in candidate_ids
    assert all(row["mix_score"] > 0 for row in result["candidates"])
    assert all(left >= right for left, right in zip(
        [row["mix_score"] for row in result["candidates"]],
        [row["mix_score"] for row in result["candidates"]][1:],
    ))


def test_candidate_filter_uses_first_selected_old_score_before_mix(blender):
    selected_rows = blender._catalog_by_id.loc[[1, 2]].reset_index(drop = True)
    candidate_row = blender._id_to_row[4]
    _, _, mix_scores = blender._mix_scores(selected_rows, [candidate_row])
    old_tag = cosine_similarity(
        blender.bundle.tag_matrix[blender._id_to_row[1]],
        blender.bundle.tag_matrix[candidate_row],
    )[0, 0]
    old_keyword = cosine_similarity(
        blender.bundle.keyword_matrix[blender._id_to_row[1]],
        blender.bundle.keyword_matrix[candidate_row],
    )[0, 0]
    old_score = np.sqrt(max(old_tag * old_keyword, 0.0))
    assert mix_scores[0] > 0
    assert old_score == 0
    result = blender.recommend([1, 2], top_k = 10, stage2_multiplier = 3)
    assert 4 not in {row["app_id"] for row in result["candidates"]}


def test_candidate_filter_does_not_change_stage2_or_top_k_order(blender):
    result = blender.recommend([1, 2], top_k = 4, stage2_multiplier = 2)
    assert [row["app_id"] for row in result["stage2"]] == [6, 5, 3, 10, 11, 12, 13, 14]
    assert [row["app_id"] for row in result["recommendations"]] == [6, 5, 10, 3]


def test_candidate_filter_returns_empty_result_when_no_old_scores_are_positive(blender, monkeypatch):
    monkeypatch.setattr(
        blender,
        "_old_scores",
        lambda selected_row_index, candidate_rows: np.zeros(len(candidate_rows)),
    )
    result = blender.recommend([1, 2])
    assert result["candidates"] == []
    assert result["stage2"] == []
    assert result["recommendations"] == []
    assert result["stage2_size"] == 0


def test_mix_score_matches_direct_reference(blender):
    result = blender.recommend([1, 2], top_k = 5, stage2_multiplier = 2)
    selected = blender.bundle.catalog[blender.bundle.catalog["Appid"].isin([1, 2])]
    tag_text = blender._mix_text(selected, "Tags")
    keyword_text = blender._mix_text(selected, "keywords")
    tag_vector = blender.bundle.tag_vectorizer.transform([tag_text])
    keyword_vector = blender.bundle.keyword_vectorizer.transform([keyword_text])
    row_index = blender._id_to_row[5]
    expected_tag = cosine_similarity(blender.bundle.tag_matrix[row_index], tag_vector)[0, 0]
    expected_keyword = cosine_similarity(blender.bundle.keyword_matrix[row_index], keyword_vector)[0, 0]
    expected_mix = np.sqrt(max(expected_tag * expected_keyword, 0.0))
    actual = next(row for row in result["candidates"] if row["app_id"] == 5)
    assert actual["tag_similarity"] == pytest.approx(expected_tag)
    assert actual["keyword_similarity"] == pytest.approx(expected_keyword)
    assert actual["mix_score"] == pytest.approx(expected_mix)


def test_stage2_size_multiplier_and_final_k(blender):
    result = blender.recommend([1, 2], top_k = 4, stage2_multiplier = 2)
    assert result["stage2_size"] == 8
    assert len(result["stage2"]) == 8
    assert len(result["recommendations"]) == 4
    assert set(row["app_id"] for row in result["stage2"]) <= set(row["app_id"] for row in result["candidates"])


def test_p75_is_derived_at_runtime_from_stage2_pool(blender):
    scores = [1.0, 0.9, 0.45, 0.4]
    expected_gaps = np.array([0.1, 0.45, 0.05]) / np.array([1.0, 0.9, 0.45])
    assert blender.adjacent_relative_gaps(scores) == pytest.approx(expected_gaps)
    assert blender.derive_p75_relative_gap(scores) == pytest.approx(np.percentile(expected_gaps, 75))
    result = blender.recommend([1, 2], top_k = 3, stage2_multiplier = 2)
    assert len(result["relative_gaps"]) == result["stage2_size"] - 1
    with pytest.raises(ValueError, match = "unsupported gap definition"):
        blender.derive_p75_relative_gap(scores, "p90_relative_gap")
    assert P75_DEFINITION == "p75_relative_gap"


def test_grouping_is_stage2_only_and_uses_strict_rule(blender):
    groups, tau, gaps = blender.group_stage2([1.0, 0.5])
    assert tau == pytest.approx(0.5)
    assert gaps.tolist() == [0.5]
    assert [(group.start, group.end) for group in groups] == [(0, 1)]
    result = blender.recommend([1, 2], top_k = 3, stage2_multiplier = 2)
    assert len(result["relative_gaps"]) == max(result["stage2_size"] - 1, 0)
    assert all(group["end"] < result["stage2_size"] for group in result["groups"])


def test_coverage_zero_full_and_selected_counts_2_3_4(blender):
    for selected, expected_full in [([1, 2], 2), ([1, 2, 3], 3), ([1, 2, 3, 4], 4)]:
        selected_rows = blender._catalog_by_id.loc[selected].reset_index(drop = True)
        counts = dict(zip([5, 9, 10], blender._coverage_counts(selected_rows, [5, 9, 10])))
        assert counts[9] == 0
        assert counts[10] == expected_full
    selected_rows = blender._catalog_by_id.loc[[1, 2, 3, 4]].reset_index(drop = True)
    counts = dict(zip([5, 6], blender._coverage_counts(selected_rows, [5, 6])))
    assert counts == {5: 3, 6: 1}


def test_within_group_reorder_preserves_equal_coverage_mix_order(blender):
    rows = [
        {"app_id": 1, "coverage_count": 0, "mix_score": 0.90},
        {"app_id": 2, "coverage_count": 2, "mix_score": 0.80},
        {"app_id": 3, "coverage_count": 1, "mix_score": 0.70},
        {"app_id": 4, "coverage_count": 1, "mix_score": 0.60},
    ]
    groups = [type("G", (), {"start": 0, "end": 1})(), type("G", (), {"start": 2, "end": 3})()]
    reordered = blender._reorder_stage2(rows, groups)
    assert [row["app_id"] for row in reordered] == [2, 1, 3, 4]
    assert sorted(row["app_id"] for row in reordered) == [1, 2, 3, 4]


def test_k_straddling_uses_reordered_stage2_and_never_crosses_groups(blender):
    rows = [
        {"app_id": 1, "coverage_count": 0, "mix_score": 0.90},
        {"app_id": 2, "coverage_count": 2, "mix_score": 0.80},
        {"app_id": 3, "coverage_count": 0, "mix_score": 0.70},
        {"app_id": 4, "coverage_count": 1, "mix_score": 0.60},
    ]
    groups = [type("G", (), {"start": 0, "end": 1})(), type("G", (), {"start": 2, "end": 3})()]
    reordered = blender._reorder_stage2(rows, groups)
    assert [row["app_id"] for row in reordered[:3]] == [2, 1, 4]
    assert set(row["app_id"] for row in reordered) == {1, 2, 3, 4}
    assert {row["app_id"] for row in reordered[:2]} == {1, 2}
    assert {row["app_id"] for row in reordered[2:]} == {3, 4}


def test_invalid_input_and_configuration_paths(blender, monkeypatch):
    for selected in ([1], [1, 2, 3, 4, 5], [1, 1], [1, 999]):
        with pytest.raises(ValueError):
            blender.recommend(selected)
    with pytest.raises(ValueError):
        blender.recommend([1, 2], top_k = 0)
    with pytest.raises(ValueError):
        blender.recommend([1, 2], stage2_multiplier = 0)

    from infrastructure.config import Settings
    monkeypatch.setenv("BLENDER_TOP_K", "0")
    with pytest.raises(RuntimeError, match = "BLENDER_TOP_K must be positive"):
        Settings.from_env()


def test_configurable_k_and_multiplier(blender):
    result = blender.recommend([1, 2], top_k = 3, stage2_multiplier = 4)
    assert result["top_k"] == 3
    assert result["stage2_multiplier"] == 4
    assert result["stage2_size"] == 12
    assert len(result["recommendations"]) == 3


def test_local_loader_joins_configured_catalog_to_existing_artifacts(blender, tmp_path):
    import joblib
    from scipy.sparse import save_npz
    from ml.artifacts import load_bundle

    for name, value in {
        "tag_vectorizer.joblib": blender.bundle.tag_vectorizer,
        "keyword_vectorizer.joblib": blender.bundle.keyword_vectorizer,
        "app_ids.joblib": blender.bundle.app_ids,
    }.items():
        joblib.dump(value, tmp_path / name)
    save_npz(tmp_path / "tag_matrix.npz", blender.bundle.tag_matrix)
    save_npz(tmp_path / "keyword_matrix.npz", blender.bundle.keyword_matrix)
    catalog_path = tmp_path / "catalog.csv"
    blender.bundle.catalog.to_csv(catalog_path, index = False)

    loaded = load_bundle(tmp_path, catalog_path)
    assert loaded.catalog["Appid"].tolist() == blender.bundle.catalog["Appid"].tolist()
    assert loaded.tag_matrix.shape == blender.bundle.tag_matrix.shape
