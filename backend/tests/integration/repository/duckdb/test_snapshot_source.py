import csv
import json
from collections.abc import Iterator
from pathlib import Path
from statistics import correlation, mean

import pytest
from fastapi.testclient import TestClient

from app.domain.snapshot import Snapshot, snapshot_issues
from app.main import create_app
from app.repository.duckdb.source import DataPaths, DuckdbSnapshotSource
from app.settings import REPOSITORY_ROOT, Settings

EXPECTED = {1250022871: 525, 1250009583: 1475}


@pytest.fixture(scope="module")
def snapshot() -> Snapshot:
    return DuckdbSnapshotSource(DataPaths.under(REPOSITORY_ROOT)).load()


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    with TestClient(create_app(Settings(data_root=REPOSITORY_ROOT))) as test_client:
        yield test_client


def _result_rows() -> dict[tuple[int, int], float]:
    with (REPOSITORY_ROOT / "result.csv").open(encoding="utf-8") as handle:
        return {
            (int(row["id"]), int(row["segment_id"])): float(row["thickness_pred"])
            for row in csv.DictReader(handle)
        }


def test_imported_snapshot_is_consistent(snapshot: Snapshot) -> None:
    assert snapshot_issues(snapshot) == ()
    assert {t.case.pipe_id: len(t.segments) for t in snapshot.targets} == EXPECTED
    for target in snapshot.targets:
        assert [f.segment_id for f in target.forecasts] == list(
            range(EXPECTED[target.case.pipe_id])
        )
        assert target.segments[-1].end_m == pytest.approx(target.passport.length_m)
        assert target.segments[-1].end_m - target.segments[-1].start_m < 10


def test_case_one_has_observed_runs_and_case_two_none(snapshot: Snapshot) -> None:
    case1, case2 = snapshot.targets
    dates = sorted({item.run_date.isoformat() for item in case1.observations})
    assert dates == ["2018-09-23", "2022-07-06"]
    assert case2.observations == ()
    assert all(item.run_date < case1.case.target_date for item in case1.observations)


def test_export_matches_organizer_file(client: TestClient) -> None:
    exported = client.get("/api/v1/exports/result.csv").text
    source = Path(REPOSITORY_ROOT / "result.csv").read_text(encoding="utf-8")

    assert exported == source


@pytest.mark.parametrize("pipe_id", sorted(EXPECTED))
def test_api_agrees_with_source_on_sampled_segments(client: TestClient, pipe_id: int) -> None:
    rows = _result_rows()
    last = EXPECTED[pipe_id] - 1
    priority = client.get(f"/api/v1/pipes/{pipe_id}/priorities").json()["items"]
    sample = {0, last // 2, last, priority[0]["segment_id"], priority[-1]["segment_id"]}

    for segment_id in sample:
        body = client.get(f"/api/v1/pipes/{pipe_id}/segments/{segment_id}").json()
        assert body["segment"]["forecast_mm"] == pytest.approx(rows[(pipe_id, segment_id)])

    ordered = sorted((v, s) for (p, s), v in rows.items() if p == pipe_id)
    assert [item["segment_id"] for item in priority] == [s for _, s in ordered[: len(priority)]]
    assert len(priority) == -(-EXPECTED[pipe_id] // 10)


def test_readiness_reports_snapshot(client: TestClient) -> None:
    body = client.get("/api/v1/ready").json()

    assert body["ready"] is True
    assert len(body["snapshot_id"]) == 12


def test_missing_root_reports_unavailable(tmp_path: Path) -> None:
    with TestClient(create_app(Settings(data_root=tmp_path))) as client:
        response = client.get("/api/v1/pipes")

    assert response.status_code == 503
    assert response.json()["code"] == "data_unavailable"


def test_comparison_is_distinct_from_selected_model(client: TestClient) -> None:
    model = client.get("/api/v1/model/validation").json()
    comparison = next(item for item in model["comparisons"] if item["case_id"] == "case1")
    selected = next(
        item for item in model["metrics"] if item["case_id"] == "case1" and item["is_selected"]
    )
    assert comparison["status"] == "available"
    assert len(comparison["points"]) == comparison["source_samples"] == 55
    source = json.loads((REPOSITORY_ROOT / "chart_data.json").read_text())["val"]["case1"]
    assert comparison["pearson_r2"] == pytest.approx(
        correlation(source["fact"], source["pred"]) ** 2
    )
    assert comparison["mae_mm"] == pytest.approx(
        mean(abs(fact - pred) for fact, pred in zip(source["fact"], source["pred"], strict=True))
    )
    with (REPOSITORY_ROOT / "artifacts/validation_report.csv").open() as handle:
        metric = next(
            row
            for row in csv.DictReader(handle)
            if row["case"] == "case1" and row["model"] == "dens_quant_cal"
        )
    assert selected["model"] == "dens_quant_cal"
    assert selected["pearson_r2"] == float(metric["pearson_r2"])
    assert comparison["pearson_r2"] != selected["pearson_r2"]
    with (REPOSITORY_ROOT / "data/processed/train_dataset.csv").open() as handle:
        validation = {
            (int(row["id"]), int(row["segment_id"])): float(row["y"])
            for row in csv.DictReader(handle)
            if row["split"] == "val_case1"
        }
    assert {(p["pipe_id"], p["segment_id"]) for p in comparison["points"]} == set(validation)
    for point in comparison["points"]:
        assert point["observed_mm"] == pytest.approx(
            validation[(point["pipe_id"], point["segment_id"])], abs=0.00051
        )


def test_incompatible_historical_observations_are_not_exposed(client: TestClient) -> None:
    model = client.get("/api/v1/model/validation").json()
    comparison = next(item for item in model["comparisons"] if item["case_id"] == "case2")
    assert comparison["status"] == "source_mismatch"
    assert comparison["source_samples"] == 525
    assert comparison["points"] == []
    assert comparison["pearson_r2"] is None
    assert comparison["mae_mm"] is None
