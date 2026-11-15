import json

from fastapi.testclient import TestClient

from app.domain.snapshot import Snapshot
from app.main import create_app
from app.settings import Settings


class StaticSource:
    def __init__(self, snapshot: Snapshot) -> None:
        self.snapshot = snapshot

    def load(self) -> Snapshot:
        return self.snapshot


def request(snapshot: Snapshot, prompt: str = "Соседи") -> dict[str, object]:
    target = snapshot.targets[0]
    return {
        "prompt": prompt,
        "context": {
            "pipe_id": target.case.pipe_id,
            "segment_id": 0,
            "snapshot_id": snapshot.snapshot_id,
            "target_date": target.case.target_date.isoformat(),
        },
    }


def test_assistant_returns_real_neighbors_and_terminal_event(snapshot: Snapshot) -> None:
    with TestClient(create_app(Settings(), StaticSource(snapshot))) as client:
        response = client.post("/api/v1/assistant", json=request(snapshot))
    assert response.status_code == 200
    events = [json.loads(line) for line in response.text.splitlines()]
    assert events[-1]["type"] == "done"
    evidence = events[1]
    assert [value["segment_id"] for value in evidence["values"]] == [0, 1]
    assert evidence["values"][0]["forecast_mm"] == snapshot.targets[0].forecasts[0].thickness_mm
    assert evidence["actions"][0]["kind"] == "range"


def test_assistant_rejects_stale_snapshot(snapshot: Snapshot) -> None:
    body = request(snapshot)
    context = body["context"]
    assert isinstance(context, dict)
    context["snapshot_id"] = "stale"
    with TestClient(create_app(Settings(), StaticSource(snapshot))) as client:
        response = client.post("/api/v1/assistant", json=body)
    assert response.status_code == 422
    assert response.json()["code"] == "invalid_question"


def test_assistant_does_not_invent_vtd(snapshot: Snapshot) -> None:
    body = request(snapshot, "Сравни с ВТД")
    context = body["context"]
    assert isinstance(context, dict)
    context["comparison_date"] = "1900-01-01"
    with TestClient(create_app(Settings(), StaticSource(snapshot))) as client:
        response = client.post("/api/v1/assistant", json=body)
    events = [json.loads(line) for line in response.text.splitlines()]
    assert "нет измерения" in events[0]["text"]
    assert events[1]["actions"] == []
