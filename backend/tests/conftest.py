import os
from collections.abc import Callable
from dataclasses import replace
from datetime import date
from pathlib import Path

import pytest

from app.domain.cases import TARGET_CASES, VALIDATION_PAIRS
from app.domain.pipeline import (
    FeatureValue,
    Forecast,
    InspectionRun,
    Observation,
    Passport,
    ResultRow,
    Segment,
    SegmentFeatures,
    TargetCase,
    TargetPipe,
)
from app.domain.reference import (
    FeatureImportance,
    QualityReport,
    RouteLine,
    ValidationMetric,
    ValidationReport,
)
from app.domain.snapshot import Snapshot
from app.usecase.catalog import ForecastCatalog
from app.usecase.interface import LogValue

FILES_PER_WORKER = 16


def count_test_files(config: pytest.Config) -> int:
    total = 0
    for arg in config.args:
        path = Path(config.invocation_params.dir, arg.split("::")[0])
        if path.is_file():
            total += 1
        elif path.is_dir():
            total += sum(1 for _ in path.rglob("test_*.py"))
    return total


@pytest.hookimpl(tryfirst=True)
def pytest_xdist_auto_num_workers(config: pytest.Config) -> int | None:
    if os.environ.get("PYTEST_XDIST_AUTO_NUM_WORKERS"):
        return None
    workers = min(os.cpu_count() or 1, count_test_files(config) // FILES_PER_WORKER)
    return workers if workers > 1 else 0


SIZES = {"case1": 12, "case2": 25}


def thickness(case: TargetCase, index: int) -> float:
    base = 7.0 if case.case_id == "case1" else 4.2
    return round(base - ((index * 7) % 11) * 0.1, 3)


def forecast(case: TargetCase, index: int) -> Forecast:
    value = thickness(case, index)
    return Forecast(index, value, value - 0.4, value - 0.2, value, value)


def target(case: TargetCase) -> TargetPipe:
    size = SIZES[case.case_id]
    nominal = 8.0 if case.case_id == "case1" else 4.5
    runs = (
        (InspectionRun(case.pipe_id, date(2022, 7, 6), 10, 9, 8.0, 5.1, True, None),)
        if case.case_id == "case1"
        else ()
    )
    observations = tuple(
        Observation(date(2022, 7, 6), i, 7.5 - i * 0.05, i % 2 == 0, i, None)
        for i in range(size)
        if runs
    )
    return TargetPipe(
        case=case,
        passport=Passport(
            case.pipe_id,
            "A - B",
            "S",
            None,
            219.0,
            nominal,
            2.5,
            None,
            size * 10 - 4.0,
            None,
            False,
            None,
        ),
        segments=tuple(
            Segment(i, i * 10.0, min(i * 10.0 + 10, size * 10 - 4.0), 80.0, 0.1, False)
            for i in range(size)
        ),
        forecasts=tuple(forecast(case, i) for i in range(size)),
        runs=runs,
        observations=observations,
        features=tuple(
            SegmentFeatures(i, (FeatureValue("z", float(i)), FeatureValue("slope", None)))
            for i in range(size)
        ),
    )


def build_snapshot() -> Snapshot:
    targets = tuple(target(case) for case in TARGET_CASES)
    return Snapshot(
        snapshot_id="test0000",
        targets=targets,
        network=tuple(
            RouteLine(t.case.pipe_id, "A - B", "S", 8.0, 100.0, ((0.0, 49.5, 55.8),))
            for t in targets
        ),
        quality=QualityReport(None, (), (), (), (), ()),
        validation=ValidationReport(
            metrics=(ValidationMetric("case1", "dens_quant_cal", 55, 0.5, 0.29),),
            importance=tuple(
                FeatureImportance(case.case_id, name, share)
                for case in TARGET_CASES
                for name, share in (("z", 0.6), ("slope", 0.4))
            ),
            pairs=VALIDATION_PAIRS,
        ),
        result=tuple(
            ResultRow(t.case.pipe_id, f.segment_id, f.thickness_mm)
            for t in targets
            for f in t.forecasts
        ),
    )


class FixedSource:
    def __init__(self, snapshot: Snapshot) -> None:
        self.snapshot = snapshot

    def load(self) -> Snapshot:
        return self.snapshot


class NullLogger:
    def info(self, event: str, **fields: LogValue) -> None:
        return None

    def warning(self, event: str, **fields: LogValue) -> None:
        return None

    def error(self, event: str, *, exc: BaseException | None = None, **fields: LogValue) -> None:
        return None


@pytest.fixture
def snapshot() -> Snapshot:
    return build_snapshot()


@pytest.fixture
def with_target() -> Callable[[Snapshot, int, TargetPipe], Snapshot]:
    def apply(snapshot: Snapshot, index: int, item: TargetPipe) -> Snapshot:
        targets = list(snapshot.targets)
        targets[index] = item
        return replace(snapshot, targets=tuple(targets))

    return apply


@pytest.fixture
def catalog_for() -> Callable[[Snapshot], ForecastCatalog]:
    def build(snapshot: Snapshot) -> ForecastCatalog:
        catalog = ForecastCatalog(FixedSource(snapshot), NullLogger())
        catalog.refresh()
        return catalog

    return build
