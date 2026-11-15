from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ContextInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pipe_id: int = Field(ge=0)
    segment_id: int = Field(ge=0)
    snapshot_id: str = Field(min_length=1, max_length=128)
    target_date: date
    comparison_date: date | None = None
    scope: Literal["segment", "pipe"] = "segment"
    from_m: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    to_m: float | None = Field(default=None, ge=0, allow_inf_nan=False)


class HistoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(max_length=16000)


class AssistantInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prompt: str = Field(min_length=1, max_length=4000)
    context: ContextInput
    history: list[HistoryInput] = Field(default_factory=list, max_length=12)
