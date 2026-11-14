import json
from dataclasses import replace
from pathlib import Path

import pytest

from app.domain.errors import DataUnavailable
from app.repository.duckdb.source import DataPaths, DuckdbSnapshotSource
from app.settings import REPOSITORY_ROOT


def test_broken_historical_pairs_reject_snapshot(tmp_path: Path) -> None:
    source = REPOSITORY_ROOT / "chart_data.json"
    document = json.loads(source.read_text())
    document["val"]["case1"]["pred"][0] = None
    copy = tmp_path / "chart_data.json"
    copy.write_text(json.dumps(document))
    paths = replace(DataPaths.under(REPOSITORY_ROOT), charts=copy)
    with pytest.raises(DataUnavailable, match="Forecast data is unavailable"):
        DuckdbSnapshotSource(paths).load()


def test_changed_fact_removes_untraceable_points(tmp_path: Path) -> None:
    document = json.loads((REPOSITORY_ROOT / "chart_data.json").read_text())
    document["val"]["case1"]["fact"][0] += 0.1
    copy = tmp_path / "chart_data.json"
    copy.write_text(json.dumps(document))
    snapshot = DuckdbSnapshotSource(replace(DataPaths.under(REPOSITORY_ROOT), charts=copy)).load()
    comparison = snapshot.validation.comparisons[0]
    assert comparison.status == "source_mismatch"
    assert comparison.points == ()
    assert comparison.pearson_r2 is None
