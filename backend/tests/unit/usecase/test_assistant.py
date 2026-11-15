import asyncio
import json
from collections.abc import Callable
from dataclasses import replace

import pytest

from app.domain.assistant import AssistantContext, AssistantQuestion
from app.domain.errors import DataUnavailable, InvalidQuestion
from app.domain.inference import Completion, JsonSchema, StructuredRequest, Tier, Usage
from app.domain.snapshot import Snapshot
from app.usecase.assistant import EngineeringAssistant
from app.usecase.assistant_tools import AssistantTools
from app.usecase.catalog import ForecastCatalog
from app.usecase.interface import Logger

CatalogFor = Callable[[Snapshot], ForecastCatalog]


class Cards:
    def card(self, pipe_id: int, segment_id: int) -> JsonSchema:
        raise DataUnavailable()


class ScriptedModel:
    def __init__(self, outputs: list[JsonSchema]) -> None:
        self.outputs = iter(outputs)
        self.requests: list[StructuredRequest] = []

    async def complete(self, request: StructuredRequest) -> Completion:
        self.requests.append(request)
        return Completion(next(self.outputs), Usage(model="gpt-6.1-sol"))


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def logger(catalog_for: CatalogFor, snapshot: Snapshot) -> Logger:
    return catalog_for(snapshot)._logger


@pytest.fixture
def tools(catalog_for: CatalogFor, snapshot: Snapshot) -> AssistantTools:
    return AssistantTools(catalog_for(snapshot), Cards())


@pytest.fixture
def question(snapshot: Snapshot) -> AssistantQuestion:
    target = snapshot.targets[0]
    return AssistantQuestion(
        "Сравни с соседями",
        AssistantContext(target.case.pipe_id, 3, snapshot.snapshot_id, target.case.target_date),
    )


def answer(ref: str = "E2") -> JsonSchema:
    return {
        "kind": "answer",
        "tool": "none",
        "segment_id": 3,
        "claims": [
            {"text": "Сравнение соседей по прогнозу, не измерение коррозии.", "evidence_ids": [ref]}
        ],
    }


@pytest.mark.anyio
async def test_model_selects_tool_then_answers_with_current_evidence(
    tools: AssistantTools, question: AssistantQuestion, logger: Logger
) -> None:
    model = ScriptedModel(
        [
            {"kind": "tool", "tool": "neighbors", "segment_id": 3, "claims": []},
            answer(),
        ]
    )
    events = [e async for e in EngineeringAssistant(tools, model, logger).stream(question)]
    assert events[-1]["type"] == "done"
    assert "[E2]" in next(e["text"] for e in events if e["type"] == "delta")
    assert all(request.tier is Tier.SMART for request in model.requests)
    first, second = (json.loads(request.prompt) for request in model.requests)
    assert len(first["evidence"]) == 1
    assert len(second["evidence"]) == 2
    assert len(second["evidence"][1]["data"]["items"]) == 5
    assert "features" not in first["evidence"][0]["data"]
    assert all(len(request.prompt) < 12000 for request in model.requests)


@pytest.mark.anyio
@pytest.mark.parametrize("ref", ["fabricated", "E20"])
async def test_unknown_citations_fail_without_publishing_answer(
    tools: AssistantTools, question: AssistantQuestion, logger: Logger, ref: str
) -> None:
    events = [
        e
        async for e in EngineeringAssistant(tools, ScriptedModel([answer(ref)]), logger).stream(
            question
        )
    ]
    assert events[-1]["type"] == "error"
    assert not any(e["type"] in ("done", "delta") for e in events)


@pytest.mark.anyio
@pytest.mark.parametrize("tool,segment", [("sql", 3), ("segment", 99999), ("segment", 3)])
async def test_disallowed_out_of_bounds_and_duplicate_tools_fail(
    tools: AssistantTools, question: AssistantQuestion, logger: Logger, tool: str, segment: int
) -> None:
    model = ScriptedModel([{"kind": "tool", "tool": tool, "segment_id": segment}])
    events = [e async for e in EngineeringAssistant(tools, model, logger).stream(question)]
    assert events[-1]["type"] == "error"
    assert not any(e["type"] == "done" for e in events)


def test_stale_snapshot_and_dates_are_rejected(
    tools: AssistantTools, question: AssistantQuestion, logger: Logger
) -> None:
    assistant = EngineeringAssistant(tools, None, logger)
    with pytest.raises(InvalidQuestion):
        assistant.validate(replace(question, context=replace(question.context, snapshot_id="old")))
    with pytest.raises(InvalidQuestion):
        assistant.validate(replace(question, history=(("user", "x" * 24001),)))


@pytest.mark.anyio
async def test_offline_mode_is_explicit_and_reads_current_ranking(
    tools: AssistantTools, question: AssistantQuestion, logger: Logger
) -> None:
    events = [e async for e in EngineeringAssistant(tools, None, logger).stream(question)]
    assert events[-1]["type"] == "done"
    text = next(e["text"] for e in events if e["type"] == "delta")
    assert "без LLM" in text and "не вероятность отказа" in text


@pytest.mark.anyio
async def test_cancellation_reaches_pending_provider(
    tools: AssistantTools, question: AssistantQuestion, logger: Logger
) -> None:
    entered, cancelled = asyncio.Event(), asyncio.Event()

    class WaitingModel:
        async def complete(self, request: StructuredRequest) -> Completion:
            entered.set()
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                cancelled.set()
                raise
            raise AssertionError

    async def consume() -> None:
        async for _ in EngineeringAssistant(tools, WaitingModel(), logger).stream(question):
            pass

    task = asyncio.create_task(consume())
    await asyncio.wait_for(entered.wait(), 2)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert cancelled.is_set()


@pytest.mark.anyio
async def test_tool_budget_requires_final_answer(
    tools: AssistantTools, question: AssistantQuestion, logger: Logger
) -> None:
    model = ScriptedModel(
        [{"kind": "tool", "tool": "segment", "segment_id": i, "claims": []} for i in range(4, 9)]
    )
    events = [e async for e in EngineeringAssistant(tools, model, logger).stream(question)]
    assert len(model.requests) == 5
    assert model.requests[-1].schema["properties"]["kind"]["enum"] == ["answer"]
    assert events[-1]["type"] == "error"
