from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.domain.errors import InvalidQuestion
from app.main import create_app
from app.repository.research_data import ResearchDataSource
from app.repository.research_metrics import statistics
from app.settings import Settings


@pytest.fixture(scope="module")
def environment(
    tmp_path_factory: pytest.TempPathFactory,
) -> Iterator[tuple[TestClient, ResearchDataSource]]:
    app = create_app(Settings(state_root=tmp_path_factory.mktemp("state")))
    with TestClient(app) as client:
        yield client, app.state.research_data


def make(
    environment: tuple[TestClient, ResearchDataSource],
) -> tuple[TestClient, ResearchDataSource, str]:
    client, data = environment
    context = data.tools.current_context(1250022871)
    table = data.execute(
        "query_data",
        {
            "sql": "select segment_id, start_m from analytics.segments "
            "where pipe_id=1250022871 order by segment_id"
        },
        context,
    )
    chart = data.execute(
        "render_chart",
        {"data_ref": table["artifact_id"], "kind": "line", "x": "segment_id", "y": "start_m"},
        context,
    )
    dashboard = data.execute(
        "compose_dashboard",
        {"title": "Inspection", "artifact_ids": [table["artifact_id"], chart["artifact_id"]]},
        context,
    )
    return client, data, dashboard["artifact_id"]


def test_catalog_has_real_columns_units_and_descriptions(
    environment: tuple[TestClient, ResearchDataSource],
) -> None:
    _, data = environment
    context = data.tools.current_context(1250022871)
    catalog = data.execute("data_catalog", {"table": "regime_daily"}, context)
    fields = {c["name"]: c for c in catalog["tables"][0]["columns"]}
    assert fields["v_liquid_m_s"]["unit"] == "m/s"
    assert fields["calc_date"]["unit"] == "ISO-8601"
    assert "description" in fields["watercut_pct"]
    assert fields["pipe_id"]["type"] == "BIGINT"


def test_sql_decimal_columns_are_numeric_statistics(
    environment: tuple[TestClient, ResearchDataSource],
) -> None:
    _, data = environment
    result = data.execute(
        "query_data",
        {"sql": "select start_m from analytics.segments where pipe_id=1250022871"},
        data.tools.current_context(1250022871),
    )
    assert result["statistics"]["start_m"]["max"] == 5240
    assert isinstance(result["sample"][0]["start_m"], float)


def test_statistics_cover_entire_result_and_nulls() -> None:
    result = statistics([{"x": None}, {"x": 0}, {"x": 10}, {"x": 20}], ["x"])["x"]
    assert result["mean"] == result["median"] == 10
    assert result["null_count"] == 1
    assert result["p10"] == 2 and result["p90"] == 18
    assert statistics([], ["x"])["x"]["count"] == 0


def test_methodology_search_returns_primary_sources(
    environment: tuple[TestClient, ResearchDataSource],
) -> None:
    _, data = environment
    result = data.execute(
        "search_methodology",
        {"query": "вода water wetting"},
        data.tools.current_context(1250022871),
    )
    assert result["available"]
    assert result["matches"]
    assert all(
        item["url"].startswith("https://") and item["verified_on"] for item in result["matches"]
    )
    assert data.methods.search('" OR * --')["matches"] == []


def test_comparison_has_observations_and_missing_history(
    environment: tuple[TestClient, ResearchDataSource],
) -> None:
    _, data = environment
    result = data.execute(
        "compare_pipes",
        {"pipe_ids": [1250022871, 1250009583]},
        data.tools.current_context(1250022871),
    )
    first, second = result["items"]
    assert first["last_inspection"] is not None and first["defects_per_km"] is not None
    assert second["last_inspection"] is None
    assert second["historical_mean_change_mm_year"] is None
    assert first["regime"]["days"] > 0
    assert first["forecast"]["kind"] == "forecast"
    assert second["forecast"]["segments"] == 1475


def test_pagination_versions_refresh_and_reopening(
    environment: tuple[TestClient, ResearchDataSource],
) -> None:
    client, data, dashboard_id = make(environment)
    old = data.artifact(dashboard_id)
    table_id = old["artifact_ids"][0]
    assert "rows" not in client.get(f"/api/v1/assistant/artifacts/{table_id}").json()
    page1 = client.get(f"/api/v1/assistant/artifacts/{table_id}/rows?offset=0&limit=100").json()
    page2 = client.get(f"/api/v1/assistant/artifacts/{table_id}/rows?offset=100&limit=100").json()
    assert page1["total"] == 525 and len(page2["items"]) == 100
    assert page1["items"][-1]["segment_id"] == 99 and page2["items"][0]["segment_id"] == 100
    assert client.get(f"/api/v1/assistant/artifacts/{table_id}/rows?offset=-1").status_code == 422
    refreshed = client.post(f"/api/v1/assistant/dashboards/{dashboard_id}/refresh").json()
    assert refreshed["version"] == 2 and refreshed["dashboard_id"] == dashboard_id
    assert refreshed["artifact_ids"] != old["artifact_ids"]
    assert data.artifact(dashboard_id) == old
    history = client.get(f"/api/v1/assistant/dashboards/{dashboard_id}/versions").json()
    assert [v["version"] for v in history] == [2, 1]
    assert data.store.versions(dashboard_id) == history


def test_failed_refresh_preserves_published_dashboard(
    environment: tuple[TestClient, ResearchDataSource],
) -> None:
    _client, data, dashboard_id = make(environment)
    old = data.artifact(dashboard_id)
    table = data.store.put({"kind": "table", "rows": [], "snapshot_id": old["snapshot_id"]})
    invalid = data.store.put({**old, "artifact_ids": [table["artifact_id"]]})
    before = data.dashboards()
    with pytest.raises(InvalidQuestion):
        data.refresh(invalid["artifact_id"])
    assert data.dashboards() == before
