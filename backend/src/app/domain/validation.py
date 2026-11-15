from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True, slots=True)
class ValidationPoint:
    pipe_id: int
    segment_id: int
    observed_mm: float
    forecast_mm: float


@dataclass(frozen=True, slots=True)
class ValidationComparison:
    case_id: str
    status: Literal["available", "source_mismatch"]
    source: str
    source_samples: int
    points: tuple[ValidationPoint, ...]
    pearson_r2: float | None
    mae_mm: float | None
