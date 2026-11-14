from dataclasses import dataclass
from datetime import date
from enum import StrEnum

from app.domain.pipeline import (
    Forecast,
    InspectionRun,
    Observation,
    Passport,
    Segment,
    TargetCase,
)
from app.domain.priority import PriorityItem


@dataclass(frozen=True, slots=True)
class PipeSummary:
    case: TargetCase
    passport: Passport
    segments: int
    thinnest: PriorityItem
    median_mm: float
    priority_count: int
    priority_cutoff_mm: float
    runs: tuple[InspectionRun, ...]
    last_observed_run: date | None
    last_observed_min_mm: float | None


@dataclass(frozen=True, slots=True)
class SegmentRow:
    segment: Segment
    forecast: Forecast
    observations: tuple[Observation, ...]
    priority_rank: int | None


@dataclass(frozen=True, slots=True)
class FeatureEvidence:
    name: str
    value: float | None
    pipe_median: float | None
    share: float


@dataclass(frozen=True, slots=True)
class SegmentDetail:
    row: SegmentRow
    nominal_wall_mm: float
    features: tuple[FeatureEvidence, ...]
    previous_id: int | None
    next_id: int | None


class SegmentSort(StrEnum):
    SEGMENT = "segment"
    THICKNESS = "thickness"


@dataclass(frozen=True, slots=True)
class SegmentQuery:
    from_m: float | None = None
    to_m: float | None = None
    priority_only: bool = False
    sort: SegmentSort = SegmentSort.SEGMENT
    descending: bool = False
    offset: int = 0
    limit: int = 100


@dataclass(frozen=True, slots=True)
class SegmentPage:
    total: int
    offset: int
    limit: int
    items: tuple[SegmentRow, ...]
