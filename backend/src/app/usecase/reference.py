from dataclasses import dataclass

from app.domain.cases import TARGET_CASES
from app.domain.pipeline import ResultRow, TargetCase
from app.domain.reference import QualityReport, RouteLine, ValidationReport
from app.usecase.catalog import ForecastCatalog


@dataclass(frozen=True, slots=True)
class Export:
    snapshot_id: str
    rows: tuple[ResultRow, ...]


@dataclass(frozen=True, slots=True)
class ModelCard:
    report: ValidationReport
    cases: tuple[TargetCase, ...]


class ReferenceQueries:
    def __init__(self, catalog: ForecastCatalog) -> None:
        self._catalog = catalog

    def snapshot_id(self) -> str:
        return self._catalog.snapshot().snapshot_id

    def network(self) -> tuple[RouteLine, ...]:
        return self._catalog.snapshot().network

    def quality(self) -> QualityReport:
        return self._catalog.snapshot().quality

    def model(self) -> ModelCard:
        return ModelCard(report=self._catalog.snapshot().validation, cases=TARGET_CASES)

    def result(self) -> Export:
        snapshot = self._catalog.snapshot()
        return Export(snapshot_id=snapshot.snapshot_id, rows=snapshot.result)
