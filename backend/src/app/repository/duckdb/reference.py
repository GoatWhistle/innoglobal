from pathlib import Path

import duckdb
from app.domain.cases import VALIDATION_PAIRS
from app.domain.pipeline import InspectionRun
from app.domain.reference import (
    FeatureImportance,
    LayerTable,
    QualityCheck,
    QualityReport,
    QuarantineCount,
    RegimeCoverage,
    RouteLine,
    ValidationMetric,
    ValidationReport,
)
from app.domain.snapshot import decimate
from app.domain.validation import ValidationComparison

LAYERS = ("raw", "core", "quarantine", "mart")
ROUTE_STEP_M = 20.0


def _tables(con: duckdb.DuckDBPyConnection) -> tuple[LayerTable, ...]:
    names = con.execute(
        "select schema_name, table_name from duckdb_tables() "
        "where schema_name in ('raw', 'core', 'quarantine', 'mart') "
        "and not table_name like '\\_%' escape '\\' order by schema_name, table_name"
    ).fetchall()
    tables = []
    for schema, table in names:
        count = con.execute(f'select count(*) from "{schema}"."{table}"').fetchone()
        tables.append(LayerTable(str(schema), str(table), int(count[0]) if count else 0))
    order = {layer: index for index, layer in enumerate(LAYERS)}
    return tuple(sorted(tables, key=lambda item: (order[item.layer], item.table)))


def _quarantine(con: duckdb.DuckDBPyConnection) -> tuple[QuarantineCount, ...]:
    counts: list[QuarantineCount] = []
    for table in ("ili_feature", "regime_daily", "route_point"):
        rows = con.execute(
            f'select reason, count(*) from quarantine."{table}" group by 1 order by 2 desc'
        ).fetchall()
        counts.extend(QuarantineCount(table, str(reason), int(n)) for reason, n in rows)
    return tuple(counts)


def load_quality(
    con: duckdb.DuckDBPyConnection, pipe_ids: tuple[int, ...], runs: tuple[InspectionRun, ...]
) -> QualityReport:
    checks = con.execute(
        "select checked_at, check_name, severity, n_failed, n_total, description "
        "from dq.check_result order by check_name"
    ).fetchall()
    regime = con.execute(
        """
        select pipe_id, min(calc_date), max(calc_date), count(*)
        from core.regime_daily where list_contains($ids, pipe_id) group by 1 order by 1
        """,
        {"ids": list(pipe_ids)},
    ).fetchall()
    return QualityReport(
        checked_at=max((row[0] for row in checks), default=None),
        checks=tuple(
            QualityCheck(str(r[1]), str(r[2]), int(r[3]), int(r[4]), r[5]) for r in checks
        ),
        quarantine=_quarantine(con),
        tables=_tables(con),
        regime=tuple(RegimeCoverage(int(r[0]), r[1], r[2], int(r[3])) for r in regime),
        runs=runs,
    )


def load_network(con: duckdb.DuckDBPyConnection) -> tuple[RouteLine, ...]:
    pipes = con.execute(
        "select pipe_id, direction, section_name, wt_nom_mm, profile_length_m "
        "from core.pipe order by pipe_id"
    ).fetchall()
    points = con.execute(
        "select pipe_id, dist_m, lon, lat from core.route_point "
        "where lon is not null and lat is not null order by pipe_id, dist_m"
    ).fetchall()
    grouped: dict[int, list[tuple[float, float, float]]] = {}
    for pipe_id, dist, lon, lat in points:
        grouped.setdefault(int(pipe_id), []).append((float(dist), float(lon), float(lat)))
    return tuple(
        RouteLine(
            pipe_id=int(row[0]),
            direction=str(row[1]),
            section_name=str(row[2]),
            nominal_wall_mm=float(row[3]),
            length_m=float(row[4]),
            points=decimate(tuple(grouped.get(int(row[0]), ())), ROUTE_STEP_M),
        )
        for row in pipes
    )


def load_validation(
    con: duckdb.DuckDBPyConnection,
    report: Path,
    importance: dict[str, Path],
    comparisons: tuple[ValidationComparison, ...],
) -> ValidationReport:
    metrics = con.execute(
        'select "case", model, n, pearson_r2, mae from read_csv($path, header = true)',
        {"path": str(report)},
    ).fetchall()
    shares: list[FeatureImportance] = []
    for case_id, path in importance.items():
        rows = con.execute(
            "select feature, importance / sum(importance) over () "
            "from read_csv($path, header = true) order by importance desc, feature",
            {"path": str(path)},
        ).fetchall()
        shares.extend(FeatureImportance(case_id, str(f), float(s)) for f, s in rows)
    return ValidationReport(
        metrics=tuple(
            ValidationMetric(str(r[0]), str(r[1]), int(r[2]), float(r[3]), float(r[4]))
            for r in metrics
        ),
        importance=tuple(shares),
        pairs=VALIDATION_PAIRS,
        comparisons=comparisons,
    )
