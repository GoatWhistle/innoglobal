from dataclasses import dataclass

from app.domain.pipeline import Forecast

PRIORITY_PERCENT = 10


@dataclass(frozen=True, slots=True)
class PriorityItem:
    rank: int
    segment_id: int
    thickness_mm: float


def priority_count(total: int) -> int:
    if total <= 0:
        return 0
    return max(1, -(-total * PRIORITY_PERCENT // 100))


def inspection_priorities(forecasts: tuple[Forecast, ...]) -> tuple[PriorityItem, ...]:
    ordered = sorted(forecasts, key=lambda item: (item.thickness_mm, item.segment_id))
    chosen = ordered[: priority_count(len(forecasts))]
    return tuple(
        PriorityItem(rank=index + 1, segment_id=item.segment_id, thickness_mm=item.thickness_mm)
        for index, item in enumerate(chosen)
    )
