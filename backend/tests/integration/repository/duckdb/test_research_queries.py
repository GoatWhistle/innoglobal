from pathlib import Path

import pytest

from app.domain.errors import InvalidQuestion
from app.repository.research_sql import query, validate_sql
from app.repository.research_store import ResearchStore
from app.settings import REPOSITORY_ROOT


@pytest.mark.parametrize(
    "sql",
    [
        "select * from read_csv('/etc/passwd')",
        "attach database x",
        "select * from core.pipe",
        "select 1; select 2",
        "select getenv('HOME')",
        "select * into evil from analytics.pipes",
    ],
)
def test_query_rejects_external_sources_and_commands(sql: str) -> None:
    with pytest.raises(InvalidQuestion):
        validate_sql(sql)


def test_query_reads_real_pipes_and_applies_cutoff() -> None:
    result = query(REPOSITORY_ROOT, "select count(*) as n from analytics.pipes", "2022-07-01")
    assert result["rows"] == [{"n": 16}]
    result = query(
        REPOSITORY_ROOT,
        "select max(calc_date) as last_date from analytics.regime_daily",
        "2022-07-01",
    )
    assert str(result["rows"][0]["last_date"]) <= "2022-07-01"


def test_saved_artifact_survives_reopening(tmp_path: Path) -> None:
    path = tmp_path / "state.sqlite3"
    artifact = ResearchStore(path).put({"kind": "dashboard", "artifact_ids": []})
    reopened = ResearchStore(path)
    assert reopened.artifact(artifact["artifact_id"]) == artifact
    assert reopened.dashboards() == [artifact]
