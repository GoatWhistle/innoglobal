from datetime import date

import pytest
from pydantic_ai.models.test import TestModel

from app.adapter.llm.pydantic_research import PydanticResearch
from app.domain.assistant import AssistantContext, AssistantQuestion
from app.domain.inference import JsonSchema


class Data:
    def execute(self, name: str, arguments: JsonSchema, context: AssistantContext) -> JsonSchema:
        return {"row_count": 2000, "artifact_id": "chart-reference"}

    def artifact(self, artifact_id: str) -> JsonSchema:
        return {}

    def dashboards(self) -> list[JsonSchema]:
        return []


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.mark.anyio
async def test_native_agent_calls_tool_and_emits_artifact_reference() -> None:
    model = TestModel(
        call_tools=["data_catalog"],
        custom_output_args={"claims": [{"text": "Sources available", "evidence_ids": ["E1"]}]},
    )
    question = AssistantQuestion(
        "Show sources", AssistantContext(1, 0, "snapshot", date(2023, 1, 1))
    )
    events = [event async for event in PydanticResearch(Data(), model).stream(question)]
    assert events[-1]["type"] == "done"
    assert any(event.get("artifact_id") == "chart-reference" for event in events)
    assert "[E1]" in next(event["text"] for event in events if event["type"] == "delta")
