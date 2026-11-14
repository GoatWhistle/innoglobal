from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

from app.controller.pipes.schemas import RunOut


class RouteOut(BaseModel):
    pipe_id: int
    direction: str
    section_name: str
    nominal_wall_mm: float
    length_m: float
    case_id: str | None
    points: list[tuple[float, float, float]]


class NetworkOut(BaseModel):
    snapshot_id: str
    lines: list[RouteOut]


class CheckOut(BaseModel):
    name: str
    severity: Literal["error", "warn", "info"]
    failed: int
    total: int
    description: str | None


class QuarantineOut(BaseModel):
    table: str
    reason: str
    rows: int


class TableOut(BaseModel):
    layer: str
    table: str
    rows: int


class RegimeOut(BaseModel):
    pipe_id: int
    first_day: date | None
    last_day: date | None
    days: int


class QualityOut(BaseModel):
    snapshot_id: str
    checked_at: datetime | None
    checks: list[CheckOut]
    quarantine: list[QuarantineOut]
    tables: list[TableOut]
    regime: list[RegimeOut]
    runs: list[RunOut]


class MetricOut(BaseModel):
    case_id: str
    model: str
    segments: int
    pearson_r2: float
    mae_mm: float
    is_baseline: bool
    is_selected: bool


class ImportanceOut(BaseModel):
    case_id: str
    feature: str
    share: float


class PairOut(BaseModel):
    case_id: str
    pipe_ids: list[int]
    start: str
    end: date


class CaseOut(BaseModel):
    case_id: str
    pipe_id: int
    target_date: date
    mode: Literal["between_inspections", "from_commissioning"]
    predictor: str


class ComparisonPointOut(BaseModel):
    pipe_id: int
    segment_id: int
    observed_mm: float
    forecast_mm: float


class ComparisonOut(BaseModel):
    case_id: str
    status: Literal["available", "source_mismatch"]
    source: str
    source_samples: int
    points: list[ComparisonPointOut]
    pearson_r2: float | None
    mae_mm: float | None


class ModelOut(BaseModel):
    snapshot_id: str
    cases: list[CaseOut]
    comparisons: list[ComparisonOut]
    metrics: list[MetricOut]
    importance: list[ImportanceOut]
    pairs: list[PairOut]
    quantiles: list[Literal["p05", "p10", "p90", "p95"]]


class ReadyOut(BaseModel):
    ready: bool
    snapshot_id: str | None
    issues: list[str]
