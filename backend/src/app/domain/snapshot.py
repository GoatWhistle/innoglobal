import itertools
import math
from collections import Counter
from dataclasses import dataclass

from app.domain.pipeline import ResultRow, TargetPipe
from app.domain.reference import QualityReport, RouteLine, ValidationReport

TOLERANCE_MM = 1e-6
RESULT_TOLERANCE_MM = 5e-4


@dataclass(frozen=True, slots=True)
class Snapshot:
    snapshot_id: str
    targets: tuple[TargetPipe, ...]
    network: tuple[RouteLine, ...]
    quality: QualityReport
    validation: ValidationReport
    result: tuple[ResultRow, ...]


def _bounds_issues(target: TargetPipe) -> list[str]:
    issues: list[str] = []
    nominal = target.passport.nominal_wall_mm
    for item in target.forecasts:
        values = (item.p05_mm, item.p10_mm, item.thickness_mm, item.p90_mm, item.p95_mm)
        label = f"pipe {target.case.pipe_id} segment {item.segment_id}"
        if not all(math.isfinite(value) for value in values):
            issues.append(f"{label}: non-finite forecast")
            continue
        if any(b - a < -TOLERANCE_MM for a, b in itertools.pairwise(values)):
            issues.append(f"{label}: quantiles out of order")
        if item.thickness_mm <= 0 or item.thickness_mm > nominal + TOLERANCE_MM:
            issues.append(f"{label}: forecast outside (0, nominal]")
    return issues


def _coverage_issues(target: TargetPipe) -> list[str]:
    pipe = target.case.pipe_id
    expected = [segment.segment_id for segment in target.segments]
    if expected != list(range(len(expected))):
        return [f"pipe {pipe}: segment grid is not contiguous from 0"]
    counts = Counter(item.segment_id for item in target.forecasts)
    issues = [
        f"pipe {pipe}: duplicate forecast for segment {sid}" for sid, n in counts.items() if n > 1
    ]
    missing = sorted(set(expected) - set(counts))
    extra = sorted(set(counts) - set(expected))
    if missing:
        issues.append(f"pipe {pipe}: {len(missing)} segments without forecast, first {missing[0]}")
    if extra:
        issues.append(f"pipe {pipe}: {len(extra)} forecasts outside the grid, first {extra[0]}")
    return issues


def _result_issues(snapshot: Snapshot) -> list[str]:
    forecast = {
        (target.case.pipe_id, item.segment_id): item.thickness_mm
        for target in snapshot.targets
        for item in target.forecasts
    }
    keys = Counter((row.pipe_id, row.segment_id) for row in snapshot.result)
    issues = [f"result.csv: duplicate row {key}" for key, n in keys.items() if n > 1]
    if set(keys) != set(forecast):
        issues.append("result.csv: rows do not match the forecast grid")
    for row in snapshot.result:
        if not math.isfinite(row.thickness_mm):
            issues.append(f"result.csv: non-finite result {row.pipe_id}/{row.segment_id}")
            continue
        expected = forecast.get((row.pipe_id, row.segment_id))
        if expected is not None and abs(expected - row.thickness_mm) > RESULT_TOLERANCE_MM:
            issues.append(f"result.csv: {row.pipe_id}/{row.segment_id} differs from forecast")
    return issues


def snapshot_issues(snapshot: Snapshot) -> tuple[str, ...]:
    issues: list[str] = []
    for target in snapshot.targets:
        issues.extend(_coverage_issues(target))
        issues.extend(_bounds_issues(target))
    issues.extend(_result_issues(snapshot))
    return tuple(issues)


def decimate(
    points: tuple[tuple[float, float, float], ...], step_m: float
) -> tuple[tuple[float, float, float], ...]:
    if len(points) <= 2:
        return points
    kept = [points[0]]
    for point in points[1:-1]:
        if point[0] - kept[-1][0] >= step_m:
            kept.append(point)
    kept.append(points[-1])
    return tuple(kept)
