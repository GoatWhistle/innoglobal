from datetime import date
from typing import Literal

from pydantic import BaseModel

from app.domain.pipeline import InspectionRun, Observation, Passport
from app.usecase.views import PipeSummary, SegmentRow


class RunOut(BaseModel):
    pipe_id: int
    run_date: date
    n_features: int
    n_metal_loss: int
    wall_mode_mm: float | None
    min_residual_mm: float | None
    is_training_eligible: bool
    exclusion_reason: str | None

    @classmethod
    def of(cls, run: InspectionRun) -> "RunOut":
        return cls(**{name: getattr(run, name) for name in cls.model_fields})


class PassportOut(BaseModel):
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

    @classmethod
    def of(cls, passport: Passport) -> "PassportOut":
        return cls(**{name: getattr(passport, name) for name in cls.model_fields})


class PipeOut(BaseModel):
    pipe_id: int
    case_id: str
    mode: Literal["between_inspections", "from_commissioning"]
    target_date: date
    predictor: str
    passport: PassportOut
    segments: int
    thinnest_segment_id: int
    thinnest_mm: float
    median_mm: float
    priority_count: int
    priority_percent: int
    priority_cutoff_mm: float
    runs: list[RunOut]
    last_observed_run: date | None
    last_observed_min_mm: float | None

    @classmethod
    def of(cls, item: PipeSummary, percent: int) -> "PipeOut":
        return cls(
            pipe_id=item.case.pipe_id,
            case_id=item.case.case_id,
            mode=item.case.mode.value,
            target_date=item.case.target_date,
            predictor=item.case.predictor,
            passport=PassportOut.of(item.passport),
            segments=item.segments,
            thinnest_segment_id=item.thinnest.segment_id,
            thinnest_mm=item.thinnest.thickness_mm,
            median_mm=item.median_mm,
            priority_count=item.priority_count,
            priority_percent=percent,
            priority_cutoff_mm=item.priority_cutoff_mm,
            runs=[RunOut.of(run) for run in item.runs],
            last_observed_run=item.last_observed_run,
            last_observed_min_mm=item.last_observed_min_mm,
        )


class PipeListOut(BaseModel):
    snapshot_id: str
    items: list[PipeOut]


class ObservationOut(BaseModel):
    run_date: date
    residual_mm: float
    had_defect: bool
    n_metal_loss: int
    max_depth_pct: float | None

    @classmethod
    def of(cls, item: Observation) -> "ObservationOut":
        return cls(**{name: getattr(item, name) for name in cls.model_fields})


class SegmentOut(BaseModel):
    segment_id: int
    start_m: float
    end_m: float
    elevation_m: float | None
    slope_pct: float | None
    is_low_point: bool | None
    forecast_mm: float
    p05_mm: float
    p10_mm: float
    p90_mm: float
    p95_mm: float
    priority_rank: int | None
    observations: list[ObservationOut]

    @classmethod
    def of(cls, row: SegmentRow) -> "SegmentOut":
        segment, forecast = row.segment, row.forecast
        return cls(
            segment_id=segment.segment_id,
            start_m=segment.start_m,
            end_m=segment.end_m,
            elevation_m=segment.elevation_m,
            slope_pct=segment.slope_pct,
            is_low_point=segment.is_low_point,
            forecast_mm=forecast.thickness_mm,
            p05_mm=forecast.p05_mm,
            p10_mm=forecast.p10_mm,
            p90_mm=forecast.p90_mm,
            p95_mm=forecast.p95_mm,
            priority_rank=row.priority_rank,
            observations=[ObservationOut.of(item) for item in row.observations],
        )


class ProfileOut(BaseModel):
    snapshot_id: str
    pipe_id: int
    nominal_wall_mm: float
    run_dates: list[date]
    rows: list[SegmentOut]


class SegmentPageOut(BaseModel):
    snapshot_id: str
    total: int
    offset: int
    limit: int
    items: list[SegmentOut]


class FeatureOut(BaseModel):
    name: str
    value: float | None
    pipe_median: float | None
    share: float


class SegmentDetailOut(BaseModel):
    snapshot_id: str
    pipe_id: int
    case_id: str
    nominal_wall_mm: float
    segment: SegmentOut
    features: list[FeatureOut]
    previous_id: int | None
    next_id: int | None


class PrioritiesOut(BaseModel):
    snapshot_id: str
    pipe_id: int
    percent: int
    total_segments: int
    items: list[SegmentOut]
