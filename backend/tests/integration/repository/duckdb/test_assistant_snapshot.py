import json

import pytest
from fastapi.testclient import TestClient

from app.domain.assistant import AssistantContext
from app.domain.errors import DataUnavailable
from app.domain.inference import JsonSchema
from app.main import create_app
from app.repository.duckdb.source import DataPaths, DuckdbSnapshotSource
from app.repository.explanations import FileExplanations
from app.settings import REPOSITORY_ROOT, Settings
from app.usecase.assistant_tools import AssistantTools
from app.usecase.catalog import ForecastCatalog
from app.usecase.interface import Logger


@pytest.fixture(scope="module")
def catalog() -> ForecastCatalog:
    class SilentLogger:
        def info(self, event: str, **fields: object) -> None:
            pass

        def warning(self, event: str, **fields: object) -> None:
            pass

        def error(self, event: str, **fields: object) -> None:
            pass

    logger: Logger = SilentLogger()
    catalog = ForecastCatalog(DuckdbSnapshotSource(DataPaths.under(REPOSITORY_ROOT)), logger)
    assert catalog.refresh().ready
    return catalog


def test_real_explanation_matches_snapshot_and_stale_card_is_rejected(
    catalog: ForecastCatalog,
) -> None:
    source = FileExplanations(REPOSITORY_ROOT / "artifacts/explain_cards.jsonl")
    tools = AssistantTools(catalog, source)
    for target in catalog.snapshot().targets:
        context = AssistantContext(
            target.case.pipe_id, 0, catalog.snapshot().snapshot_id, target.case.target_date
        )
        result = tools.call("explanation", 0, context)
        assert result["model"]["contributions_mm"]
        assert result["missing"]
        assert len(tools.call("neighbors", 0, context)["items"]) == 3

        class StaleSource:
            def card(self, pipe_id: int, segment_id: int) -> dict[str, object]:
                card = source.card(pipe_id, segment_id)
                card["forecast"]["thickness_mm"] += 1
                return card

        with pytest.raises(DataUnavailable):
            AssistantTools(catalog, StaleSource()).call("explanation", 0, context)


def test_real_http_ndjson_and_stale_context() -> None:
    with TestClient(create_app(Settings())) as client:
        pipes = client.get("/api/v1/pipes").json()
        target = pipes["items"][0]
        body: JsonSchema = {
            "prompt": "Объясни приоритет",
            "context": {
                "pipe_id": target["pipe_id"],
                "segment_id": 0,
                "snapshot_id": pipes["snapshot_id"],
                "target_date": target["target_date"],
            },
        }
        response = client.post("/api/v1/assistant", json=body)
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("application/x-ndjson")
        events = [json.loads(line) for line in response.text.splitlines()]
        assert events[-1]["type"] == "done"
        assert all(set(e) == {"type", "text", "code", "actions", "values"} for e in events)
        assert events[1]["values"][0]["segment_id"] == 0
        body["context"] = {**body["context"], "snapshot_id": "stale"}
        assert client.post("/api/v1/assistant", json=body).status_code == 422
