from collections.abc import Callable
from dataclasses import replace

import pytest

from app.domain.errors import DataUnavailable, InvalidRange, PipeNotFound, SegmentNotFound
from app.domain.pipeline import Forecast
from app.domain.snapshot import Snapshot
from app.usecase.catalog import ForecastCatalog
from app.usecase.pipes import PipeQueries
from app.usecase.views import SegmentQuery, SegmentSort

CatalogFor = Callable[[Snapshot], ForecastCatalog]
CASE1 = 1250022871
CASE2 = 1250009583


def test_summary_reports_thinnest_and_shortlist(
    snapshot: Snapshot, catalog_for: CatalogFor
) -> None:
    queries = PipeQueries(catalog_for(snapshot))

    summary = queries.pipe(CASE2)

    values = sorted((f.thickness_mm, f.segment_id) for f in snapshot.targets[1].forecasts)
    assert summary.segments == 25
    assert summary.priority_count == 3
    assert (summary.thinnest.thickness_mm, summary.thinnest.segment_id) == values[0]
    assert summary.priority_cutoff_mm == values[2][0]
    assert summary.last_observed_run is None


def test_priorities_are_ranked_rows(snapshot: Snapshot, catalog_for: CatalogFor) -> None:
    rows = PipeQueries(catalog_for(snapshot)).priorities(CASE1)

    assert [row.priority_rank for row in rows] == [1, 2]
    assert rows[0].forecast.thickness_mm <= rows[1].forecast.thickness_mm


def test_segments_filter_sort_and_page(snapshot: Snapshot, catalog_for: CatalogFor) -> None:
    queries = PipeQueries(catalog_for(snapshot))

    page = queries.segments(
        CASE2, SegmentQuery(from_m=50, to_m=150, sort=SegmentSort.THICKNESS, limit=4)
    )

    assert page.total == 10
    assert len(page.items) == 4
    values = [row.forecast.thickness_mm for row in page.items]
    assert values == sorted(values)


def test_segment_detail_has_neighbours_and_evidence(
    snapshot: Snapshot, catalog_for: CatalogFor
) -> None:
    detail = PipeQueries(catalog_for(snapshot)).segment(CASE1, 11)

    assert (detail.previous_id, detail.next_id) == (10, None)
    assert detail.row.segment.end_m == 116.0
    assert [item.name for item in detail.features] == ["z", "slope"]
    assert detail.features[0].value == 11.0
    assert detail.features[1].value is None
    assert len(detail.row.observations) == 1


def test_errors_for_unknown_ids_and_ranges(snapshot: Snapshot, catalog_for: CatalogFor) -> None:
    queries = PipeQueries(catalog_for(snapshot))

    with pytest.raises(PipeNotFound):
        queries.pipe(1)
    with pytest.raises(SegmentNotFound):
        queries.segment(CASE1, 12)
    with pytest.raises(InvalidRange):
        queries.segments(CASE1, SegmentQuery(from_m=50, to_m=10))


def test_inconsistent_snapshot_is_rejected(snapshot: Snapshot, catalog_for: CatalogFor) -> None:
    first = snapshot.targets[0]
    bad = replace(first, forecasts=(Forecast(0, float("nan"), 1, 1, 1, 1), *first.forecasts[1:]))
    catalog = catalog_for(replace(snapshot, targets=(bad, snapshot.targets[1])))

    assert not catalog.readiness().ready
    with pytest.raises(DataUnavailable):
        PipeQueries(catalog).list_pipes()
