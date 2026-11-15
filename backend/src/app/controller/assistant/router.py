from datetime import date
from typing import Literal

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.controller.dependencies import Catalog
from app.controller.errors import ErrorResponse
from app.usecase.assistant import AssistantRequest, EngineeringAssistant

router = APIRouter(tags=["assistant"])


class ContextIn(BaseModel):
    pipe_id: int = Field(ge=1)
    segment_id: int = Field(ge=0)
    snapshot_id: str = Field(min_length=1, max_length=100)
    target_date: date
    comparison_date: date | None = None
    scope: Literal["segment", "pipe"] = "segment"
    from_m: float | None = Field(default=None, ge=0)
    to_m: float | None = Field(default=None, ge=0)


class HistoryIn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=10000)


class AssistantIn(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    context: ContextIn
    history: list[HistoryIn] = Field(default_factory=list, max_length=12)


class EventOut(BaseModel):
    type: Literal["status", "delta", "evidence", "done", "error"]
    text: str = ""
    code: str = ""
    actions: list[dict[str, object]] = Field(default_factory=list)
    values: list[dict[str, object]] = Field(default_factory=list)


@router.post(
    "/assistant",
    response_class=StreamingResponse,
    responses={
        200: {"content": {"application/x-ndjson": {"schema": EventOut.model_json_schema()}}},
        404: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
def answer(body: AssistantIn, catalog: Catalog) -> StreamingResponse:
    context = body.context
    reply = EngineeringAssistant(catalog).answer(
        AssistantRequest(
            body.prompt,
            context.pipe_id,
            context.segment_id,
            context.snapshot_id,
            context.target_date,
            context.comparison_date,
            context.scope,
        )
    )
    events = [
        EventOut(type="delta", text=reply.text),
        EventOut(type="evidence", actions=list(reply.actions), values=list(reply.values)),
        EventOut(type="done"),
    ]
    return StreamingResponse(
        iter(event.model_dump_json() + "\n" for event in events),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store"},
    )
