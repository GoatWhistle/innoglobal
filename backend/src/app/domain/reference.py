from dataclasses import dataclass
from datetime import date, datetime

from app.domain.pipeline import InspectionRun
from app.domain.validation import ValidationComparison


@dataclass(frozen=True, slots=True)
class QualityCheck:
    name: str
    severity: str
    failed: int
    total: int
    description: str | None


@dataclass(frozen=True, slots=True)
class QuarantineCount:
    table: str
    reason: str
    rows: int


@dataclass(frozen=True, slots=True)
class LayerTable:
    layer: str
    table: str
    rows: int


@dataclass(frozen=True, slots=True)
class RegimeCoverage:
    pipe_id: int
    first_day: date | None
    last_day: date | None
    days: int


@dataclass(frozen=True, slots=True)
class QualityReport:
    checked_at: datetime | None
    checks: tuple[QualityCheck, ...]
    quarantine: tuple[QuarantineCount, ...]
    tables: tuple[LayerTable, ...]
    regime: tuple[RegimeCoverage, ...]
    runs: tuple[InspectionRun, ...]


@dataclass(frozen=True, slots=True)
class ValidationMetric:
    case_id: str
    model: str
    segments: int
    pearson_r2: float
    mae_mm: float


@dataclass(frozen=True, slots=True)
class FeatureImportance:
    case_id: str
    feature: str
    share: float


@dataclass(frozen=True, slots=True)
class ValidationPair:
    case_id: str
    pipe_ids: tuple[int, ...]
    start: str
    end: date


@dataclass(frozen=True, slots=True)
class ValidationReport:
    metrics: tuple[ValidationMetric, ...]
    importance: tuple[FeatureImportance, ...]
    pairs: tuple[ValidationPair, ...]
    comparisons: tuple[ValidationComparison, ...] = ()


@dataclass(frozen=True, slots=True)
class RouteLine:
    pipe_id: int
    direction: str
    section_name: str
    nominal_wall_mm: float
    length_m: float
    points: tuple[tuple[float, float, float], ...]
