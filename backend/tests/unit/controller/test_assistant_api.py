import json
from dataclasses import dataclass

import pytest
from fastapi.testclient import TestClient

from app import main
from app.domain.errors import ModelFailure
from app.domain.inference import Completion, JsonSchema, StructuredRequest, Tier, Usage
from app.domain.snapshot import Snapshot
from app.settings import LanguageProvider, Settings


@dataclass
class Source:
    snapshot: Snapshot

    def load(self) -> Snapshot:
        return self.snapshot


@pytest.mark.parametrize("fail", [False, True])
def test_codex_request_runs_provider_and_streams_answer_or_explicit_error(
    snapshot: Snapshot, monkeypatch: pytest.MonkeyPatch, fail: bool
) -> None:
    calls: list[StructuredRequest] = []

    class Model:
        async def complete(self, request: StructuredRequest) -> Completion:
            calls.append(request)
            if fail:
                raise ModelFailure()
            return Completion(
                {
                    "kind": "answer",
                    "tool": "none",
                    "segment_id": 0,
                    "claims": [{"text": "Данные выбранного сегмента.", "evidence_ids": ["E1"]}],
                },
                Usage(model="gpt-6.1-sol"),
            )

    monkeypatch.setattr(main, "build_language_model", lambda _: Model())
    from app.usecase.assistant import EngineeringAssistant

    monkeypatch.setattr(
        main,
        "build_research_runner",
        lambda data: EngineeringAssistant(data.tools, Model(), data.tools._catalog._logger),
    )
    with TestClient(
        main.create_app(Settings(language_provider=LanguageProvider.CODEX), Source(snapshot))
    ) as client:
        target = snapshot.targets[0]
        body: JsonSchema = {
            "prompt": "Какие данные доступны?",
            "context": {
                "pipe_id": target.case.pipe_id,
                "segment_id": 0,
                "snapshot_id": snapshot.snapshot_id,
                "target_date": target.case.target_date.isoformat(),
            },
        }
        response = client.post("/api/v1/assistant", json=body)
        events = [json.loads(line) for line in response.text.splitlines()]
        assert response.status_code == 200
        assert calls[0].tier is Tier.SMART
        assert events[-1]["type"] == ("error" if fail else "done")
        if not fail:
            assert "[E1]" in next(e["text"] for e in events if e["type"] == "delta")
        else:
            assert not any(e["type"] in ("done", "delta") for e in events)
