from dataclasses import dataclass
from datetime import date
from enum import StrEnum


class ForecastMode(StrEnum):
    BETWEEN_INSPECTIONS = "between_inspections"
    FROM_COMMISSIONING = "from_commissioning"


@dataclass(frozen=True, slots=True)
class TargetCase:
    case_id: str
    pipe_id: int
    target_date: date
    mode: ForecastMode
    predictor: str


@dataclass(frozen=True, slots=True)
class Passport:
    pipe_id: int
    direction: str
    section_name: str
    medium: str | None
    diameter_mm: float
    nominal_wall_mm: float
    reject_wall_mm: float | None
    commissioned_at: date | None
    length_m: float
    steel_grade: str | None
    has_inner_coating: bool | None
    is_inhibited: bool | None


@dataclass(frozen=True, slots=True)
class Segment:
    segment_id: int
    start_m: float
    end_m: float
    elevation_m: float | None
    slope_pct: float | None
    is_low_point: bool | None


@dataclass(frozen=True, slots=True)
class Forecast:
    segment_id: int
    thickness_mm: float
    p05_mm: float
    p10_mm: float
    p90_mm: float
    p95_mm: float


@dataclass(frozen=True, slots=True)
class InspectionRun:
    pipe_id: int
    run_date: date
    n_features: int
    n_metal_loss: int
    wall_mode_mm: float | None
    min_residual_mm: float | None
    is_training_eligible: bool
    exclusion_reason: str | None


@dataclass(frozen=True, slots=True)
class Observation:
    run_date: date
    segment_id: int
    residual_mm: float
    had_defect: bool
    n_metal_loss: int
    max_depth_pct: float | None


@dataclass(frozen=True, slots=True)
class FeatureValue:
    name: str
    value: float | None


@dataclass(frozen=True, slots=True)
class SegmentFeatures:
    segment_id: int
    values: tuple[FeatureValue, ...]


@dataclass(frozen=True, slots=True)
class ResultRow:
    pipe_id: int
    segment_id: int
    thickness_mm: float


@dataclass(frozen=True, slots=True)
class TargetPipe:
    case: TargetCase
    passport: Passport
    segments: tuple[Segment, ...]
    forecasts: tuple[Forecast, ...]
    runs: tuple[InspectionRun, ...]
    observations: tuple[Observation, ...]
    features: tuple[SegmentFeatures, ...]
