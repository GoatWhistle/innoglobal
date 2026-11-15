from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True, slots=True)
class AssistantContext:
    pipe_id: int
    segment_id: int
    snapshot_id: str
    target_date: date
    comparison_date: date | None = None
    scope: str = "segment"
    from_m: float | None = None
    to_m: float | None = None


@dataclass(frozen=True, slots=True)
class AssistantQuestion:
    prompt: str
    context: AssistantContext
    history: tuple[tuple[str, str], ...] = ()
