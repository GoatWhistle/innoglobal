from collections.abc import Iterator
from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from app.domain.errors import DataUnavailable
from app.domain.snapshot import Snapshot
from app.main import create_app
from app.settings import Settings

CASE1 = 1250022871


class StaticSource:
    def __init__(self, snapshot: Snapshot | None) -> None:
        self._snapshot = snapshot

    def load(self) -> Snapshot:
        if self._snapshot is None:
            raise DataUnavailable(("missing file result.csv",))
        return self._snapshot


@pytest.fixture
def client(snapshot: Snapshot) -> Iterator[TestClient]:
    with TestClient(create_app(Settings(), StaticSource(snapshot))) as test_client:
        yield test_client


def test_pipes_list_both_cases(client: TestClient) -> None:
    body = client.get("/api/v1/pipes").json()

    assert body["snapshot_id"] == "test0000"
    assert [item["case_id"] for item in body["items"]] == ["case1", "case2"]
    assert body["items"][0]["priority_percent"] == 10


def test_profile_segment_and_priorities(client: TestClient) -> None:
    profile = client.get(f"/api/v1/pipes/{CASE1}/profile").json()
    segment = client.get(f"/api/v1/pipes/{CASE1}/segments/3").json()
    priorities = client.get(f"/api/v1/pipes/{CASE1}/priorities").json()

    assert len(profile["rows"]) == 12
    assert profile["run_dates"] == ["2022-07-06"]
    assert segment["segment"]["segment_id"] == 3
    assert segment["previous_id"] == 2
    assert [row["priority_rank"] for row in priorities["items"]] == [1, 2]


def test_exports_are_csv(client: TestClient, snapshot: Snapshot) -> None:
    result = client.get("/api/v1/exports/result.csv")
    shortlist = client.get(f"/api/v1/pipes/{CASE1}/priorities.csv")

    lines = result.text.strip().split("\n")
    assert result.headers["content-type"].startswith("text/csv")
    assert lines[0] == "id,segment_id,thickness_pred"
    assert len(lines) == len(snapshot.result) + 1
    assert shortlist.text.split("\n")[0].startswith("rank,id,segment_id")


@pytest.mark.parametrize(
    ("path", "status", "code"),
    [
        ("/api/v1/pipes/1", 404, "pipe_not_found"),
        (f"/api/v1/pipes/{CASE1}/segments/99", 404, "segment_not_found"),
        (f"/api/v1/pipes/{CASE1}/segments?from_m=50&to_m=10", 422, "invalid_range"),
        (f"/api/v1/pipes/{CASE1}/segments?limit=0", 422, "validation_error"),
    ],
)
def test_errors_use_envelope(client: TestClient, path: str, status: int, code: str) -> None:
    response = client.get(path)

    assert response.status_code == status
    assert response.json()["code"] == code


def test_unavailable_data_is_explicit() -> None:
    with TestClient(create_app(Settings(), StaticSource(None))) as client:
        ready = client.get("/api/v1/ready")
        pipes = client.get("/api/v1/pipes")
        health = client.get("/api/v1/health")

    assert ready.status_code == 503
    assert ready.json()["issues"] == ["missing file result.csv"]
    assert pipes.status_code == 503
    assert pipes.json()["code"] == "data_unavailable"
    assert health.status_code == 200


def test_reference_routes(client: TestClient, snapshot: Snapshot) -> None:
    network = client.get("/api/v1/network").json()
    model = client.get("/api/v1/model/validation").json()
    quality = client.get("/api/v1/data-quality")

    assert {line["case_id"] for line in network["lines"]} == {"case1", "case2"}
    assert model["metrics"][0]["is_selected"] is True
    assert quality.status_code == 200
    assert replace(snapshot).snapshot_id == quality.json()["snapshot_id"]
