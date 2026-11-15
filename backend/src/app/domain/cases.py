import re
from datetime import date

from app.domain.pipeline import ForecastMode, TargetCase
from app.domain.reference import ValidationPair

TARGET_CASES: tuple[TargetCase, ...] = (
    TargetCase(
        case_id="case1",
        pipe_id=1250022871,
        target_date=date(2023, 12, 1),
        mode=ForecastMode.BETWEEN_INSPECTIONS,
        predictor="dens_quant_cal",
    ),
    TargetCase(
        case_id="case2",
        pipe_id=1250009583,
        target_date=date(2022, 7, 1),
        mode=ForecastMode.FROM_COMMISSIONING,
        predictor="ens_prior_cal",
    ),
)

VALIDATION_PAIRS: tuple[ValidationPair, ...] = (
    ValidationPair(
        case_id="case1",
        pipe_ids=(1250009490, 1250011604),
        start="2022-07-06",
        end=date(2023, 12, 1),
    ),
    ValidationPair(
        case_id="case2",
        pipe_ids=(1250022871,),
        start="commissioning",
        end=date(2018, 9, 23),
    ),
)

BASELINE_PATTERN = re.compile(r"^b\d+_")


def is_baseline(model: str) -> bool:
    return BASELINE_PATTERN.match(model) is not None
