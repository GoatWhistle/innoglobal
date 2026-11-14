import csv
import json
import math
from pathlib import Path
from statistics import correlation, mean, pstdev

from app.domain.cases import VALIDATION_PAIRS
from app.domain.errors import DataUnavailable
from app.domain.validation import ValidationComparison, ValidationPoint


def _values(raw: object) -> tuple[float, ...]:
    if not isinstance(raw, list) or not raw:
        raise ValueError("expected a nonempty numeric series")
    result = []
    for value in raw:
        if isinstance(value, bool) or not isinstance(value, int | float):
            raise TypeError("expected finite numeric values")
        if not math.isfinite(value) or value <= 0:
            raise ValueError("expected finite positive thickness")
        result.append(float(value))
    return tuple(result)


def _comparison(case_id: str, raw: object, training: Path) -> ValidationComparison:
    if not isinstance(raw, dict):
        raise TypeError(f"missing comparison {case_id}")
    observed = _values(raw.get("fact"))
    forecast = _values(raw.get("pred"))
    if len(observed) != len(forecast):
        raise ValueError(f"{case_id}: mismatched observed and forecast lengths")
    with training.open(encoding="utf-8", newline="") as handle:
        rows = [row for row in csv.DictReader(handle) if row["split"] == f"val_{case_id}"]
    pair = next(pair for pair in VALIDATION_PAIRS if pair.case_id == case_id)
    keys = {(int(row["id"]), int(row["segment_id"])) for row in rows}
    matches = (
        len(rows) == len(observed) == len(keys)
        and {int(row["id"]) for row in rows} == set(pair.pipe_ids)
        and all(row["end"] == pair.end.isoformat() for row in rows)
        and all(pair.start == "commissioning" or row["start"] == pair.start for row in rows)
        and all(abs(float(row["y"]) - value) <= 0.00051 for row, value in zip(rows, observed))
    )
    points = (
        tuple(
            ValidationPoint(int(row["id"]), int(row["segment_id"]), fact, pred)
            for row, fact, pred in zip(rows, observed, forecast, strict=True)
        )
        if matches
        else ()
    )
    score = None
    if matches and len(observed) > 1:
        score = (
            correlation(observed, forecast) ** 2
            if pstdev(observed) > 1e-12 and pstdev(forecast) > 1e-12
            else 0.0
        )
    return ValidationComparison(
        case_id=case_id,
        status="available" if matches else "source_mismatch",
        source="chart_data.json",
        source_samples=len(observed),
        points=points,
        pearson_r2=score,
        mae_mm=mean(abs(a - b) for a, b in zip(observed, forecast)) if matches else None,
    )


def load_comparisons(charts: Path, training: Path) -> tuple[ValidationComparison, ...]:
    try:
        document = json.loads(charts.read_text(encoding="utf-8"))
        series = document.get("val") if isinstance(document, dict) else None
        if not isinstance(series, dict):
            raise TypeError("missing validation series")
        return tuple(
            _comparison(case_id, series.get(case_id), training) for case_id in ("case1", "case2")
        )
    except (ValueError, OSError, TypeError, KeyError) as exc:
        raise DataUnavailable((f"invalid historical comparisons: {exc}",)) from exc
