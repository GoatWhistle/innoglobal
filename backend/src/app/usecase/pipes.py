from statistics import median

from app.domain.errors import InvalidRange, SegmentNotFound
from app.domain.pipeline import Observation, TargetPipe
from app.domain.priority import inspection_priorities
from app.usecase.catalog import ForecastCatalog
from app.usecase.views import (
    FeatureEvidence,
    PipeSummary,
    SegmentDetail,
    SegmentPage,
    SegmentQuery,
    SegmentRow,
    SegmentSort,
)

FEATURE_LIMIT = 8


def _observations_by_segment(target: TargetPipe) -> dict[int, tuple[Observation, ...]]:
    grouped: dict[int, list[Observation]] = {}
    for item in sorted(target.observations, key=lambda row: row.run_date):
        grouped.setdefault(item.segment_id, []).append(item)
    return {key: tuple(value) for key, value in grouped.items()}


def _rows(target: TargetPipe) -> tuple[SegmentRow, ...]:
    ranks = {item.segment_id: item.rank for item in inspection_priorities(target.forecasts)}
    forecasts = {item.segment_id: item for item in target.forecasts}
    observed = _observations_by_segment(target)
    return tuple(
        SegmentRow(
            segment=segment,
            forecast=forecasts[segment.segment_id],
            observations=observed.get(segment.segment_id, ()),
            priority_rank=ranks.get(segment.segment_id),
        )
        for segment in target.segments
    )


def summarize(target: TargetPipe) -> PipeSummary:
    shortlist = inspection_priorities(target.forecasts)
    eligible = [run for run in target.runs if run.is_training_eligible]
    last = max(eligible, key=lambda run: run.run_date) if eligible else None
    return PipeSummary(
        case=target.case,
        passport=target.passport,
        segments=len(target.segments),
        thinnest=shortlist[0],
        median_mm=median(item.thickness_mm for item in target.forecasts),
        priority_count=len(shortlist),
        priority_cutoff_mm=shortlist[-1].thickness_mm,
        runs=target.runs,
        last_observed_run=last.run_date if last else None,
        last_observed_min_mm=last.min_residual_mm if last else None,
    )


class PipeQueries:
    def __init__(self, catalog: ForecastCatalog) -> None:
        self._catalog = catalog

    def list_pipes(self) -> tuple[PipeSummary, ...]:
        return tuple(summarize(target) for target in self._catalog.snapshot().targets)

    def pipe(self, pipe_id: int) -> PipeSummary:
        return summarize(self._catalog.target(pipe_id))

    def profile(self, pipe_id: int) -> tuple[SegmentRow, ...]:
        return _rows(self._catalog.target(pipe_id))

    def priorities(self, pipe_id: int) -> tuple[SegmentRow, ...]:
        rows = [row for row in self.profile(pipe_id) if row.priority_rank is not None]
        return tuple(sorted(rows, key=lambda row: row.priority_rank or 0))

    def segments(self, pipe_id: int, query: SegmentQuery) -> SegmentPage:
        if query.from_m is not None and query.to_m is not None and query.from_m > query.to_m:
            raise InvalidRange()
        rows = [row for row in self.profile(pipe_id) if _matches(row, query)]
        if query.sort is SegmentSort.THICKNESS:
            rows.sort(key=lambda row: (row.forecast.thickness_mm, row.segment.segment_id))
        if query.descending:
            rows.reverse()
        page = rows[query.offset : query.offset + query.limit]
        return SegmentPage(len(rows), query.offset, query.limit, tuple(page))

    def segment(self, pipe_id: int, segment_id: int) -> SegmentDetail:
        target = self._catalog.target(pipe_id)
        rows = _rows(target)
        if not 0 <= segment_id < len(rows):
            raise SegmentNotFound()
        return SegmentDetail(
            row=rows[segment_id],
            nominal_wall_mm=target.passport.nominal_wall_mm,
            features=self._evidence(target, segment_id),
            previous_id=segment_id - 1 if segment_id > 0 else None,
            next_id=segment_id + 1 if segment_id + 1 < len(rows) else None,
        )

    def _evidence(self, target: TargetPipe, segment_id: int) -> tuple[FeatureEvidence, ...]:
        ranked = [
            item
            for item in self._catalog.snapshot().validation.importance
            if item.case_id == target.case.case_id
        ][:FEATURE_LIMIT]
        own = next((row for row in target.features if row.segment_id == segment_id), None)
        values = {value.name: value.value for value in own.values} if own else {}
        evidence = []
        for item in ranked:
            column = [
                value.value
                for row in target.features
                for value in row.values
                if value.name == item.feature and value.value is not None
            ]
            evidence.append(
                FeatureEvidence(
                    name=item.feature,
                    value=values.get(item.feature),
                    pipe_median=median(column) if column else None,
                    share=item.share,
                )
            )
        return tuple(evidence)


def _matches(row: SegmentRow, query: SegmentQuery) -> bool:
    if query.priority_only and row.priority_rank is None:
        return False
    if query.from_m is not None and row.segment.end_m <= query.from_m:
        return False
    return not (query.to_m is not None and row.segment.start_m >= query.to_m)
