import json
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse

from app.controller.assistant.schemas import AssistantInput
from app.controller.errors import ErrorResponse
from app.domain.assistant import AssistantContext, AssistantQuestion
from app.usecase.assistant import EngineeringAssistant
from app.usecase.research import DashboardData, ResearchData

router = APIRouter(tags=["assistant"])


def _assistant(request: Request) -> EngineeringAssistant:
    assistant = request.app.state.assistant
    assert isinstance(assistant, EngineeringAssistant)
    return assistant


@router.post(
    "/assistant",
    response_class=StreamingResponse,
    responses={
        200: {"content": {"application/x-ndjson": {"schema": {"type": "string"}}}},
        422: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
async def ask(
    request: Request,
    body: AssistantInput,
    assistant: Annotated[EngineeringAssistant, Depends(_assistant)],
) -> StreamingResponse:
    question = AssistantQuestion(
        prompt=body.prompt,
        context=AssistantContext(**body.context.model_dump()),
        history=tuple((item.role, item.content) for item in body.history),
    )
    assistant.validate(question)

    async def lines() -> AsyncIterator[str]:
        runner = request.app.state.research_runner
        stream = runner.stream(question) if runner is not None else assistant.stream(question)
        async for item in stream:
            yield json.dumps(item, ensure_ascii=False, allow_nan=False, default=str) + "\n"

    return StreamingResponse(
        lines(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


@router.get("/assistant/artifacts/{artifact_id}")
async def artifact(
    artifact_id: str, request: Request, include_rows: bool = False
) -> dict[str, object]:
    data: ResearchData = request.app.state.research_data
    result = data.artifact(artifact_id)
    return (
        result if include_rows else {key: value for key, value in result.items() if key != "rows"}
    )


@router.get("/assistant/dashboards")
async def dashboards(request: Request) -> list[dict[str, object]]:
    data: ResearchData = request.app.state.research_data
    return data.dashboards()


@router.get("/assistant/artifacts/{artifact_id}/rows")
async def artifact_rows(
    artifact_id: str,
    request: Request,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> dict[str, object]:
    data: ResearchData = request.app.state.research_data
    artifact = data.artifact(artifact_id)
    rows = artifact.get("rows", [])
    return {
        "artifact_id": artifact_id,
        "columns": artifact.get("columns", []),
        "total": len(rows),
        "offset": offset,
        "limit": limit,
        "items": rows[offset : offset + limit],
    }


@router.post("/assistant/dashboards/{artifact_id}/refresh")
async def refresh_dashboard(artifact_id: str, request: Request) -> dict[str, object]:
    data: DashboardData = request.app.state.research_data
    return data.refresh(artifact_id)


@router.get("/assistant/dashboards/{artifact_id}/versions")
async def dashboard_versions(artifact_id: str, request: Request) -> list[dict[str, object]]:
    data: DashboardData = request.app.state.research_data
    return data.versions(artifact_id)
