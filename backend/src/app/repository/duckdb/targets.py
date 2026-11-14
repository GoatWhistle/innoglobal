import math
from pathlib import Path
from typing import Any

import duckdb
from app.domain.pipeline import (
    FeatureValue,
    Forecast,
    InspectionRun,
    Observation,
    Passport,
    Segment,
    SegmentFeatures,
    TargetCase,
    TargetPipe,
)

NUMERIC_TYPES = ("DOUBLE", "BIGINT", "INTEGER", "FLOAT", "DECIMAL", "SMALLINT", "HUGEINT")
KEY_COLUMNS = ("id", "segment_id")


def _float(value: Any) -> float | None:
    if value is None:
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def _passport(con: duckdb.DuckDBPyConnection, pipe_id: int) -> Passport | None:
    row = con.execute(
        """
        select pipe_id, direction, section_name, medium, d_mm, wt_nom_mm, wt_reject_mm,
               commissioned_at, profile_length_m, steel_grade, has_inner_coating, is_inhibited
        from core.pipe where pipe_id = $pipe
        """,
        {"pipe": pipe_id},
    ).fetchone()
    if row is None:
        return None
    return Passport(
        pipe_id=int(row[0]),
        direction=str(row[1]),
        section_name=str(row[2]),
        medium=row[3],
        diameter_mm=float(row[4]),
        nominal_wall_mm=float(row[5]),
        reject_wall_mm=_float(row[6]),
        commissioned_at=row[7],
        length_m=float(row[8]),
        steel_grade=row[9],
        has_inner_coating=row[10],
        is_inhibited=row[11],
    )


def _segments(con: duckdb.DuckDBPyConnection, pipe_id: int) -> tuple[Segment, ...]:
    rows = con.execute(
        """
        select s.segment_id, s.start_m::double, least(s.end_m::double, p.profile_length_m),
               s.z_center_m, s.slope_pct, s.is_low_point
        from core.segment s join core.pipe p using (pipe_id)
        where s.pipe_id = $pipe order by s.segment_id
        """,
        {"pipe": pipe_id},
    ).fetchall()
    return tuple(
        Segment(int(r[0]), float(r[1]), float(r[2]), _float(r[3]), _float(r[4]), r[5]) for r in rows
    )


def load_runs(con: duckdb.DuckDBPyConnection) -> tuple[InspectionRun, ...]:
    rows = con.execute(
        """
        select pipe_id, run_date, n_features, n_metal_loss, wall_mode_mm, min_residual_mm,
               is_training_eligible, exclusion_reason
        from core.ili_run order by pipe_id, run_date
        """
    ).fetchall()
    return tuple(
        InspectionRun(
            int(r[0]), r[1], int(r[2]), int(r[3]), _float(r[4]), _float(r[5]), bool(r[6]), r[7]
        )
        for r in rows
    )


def _observations(con: duckdb.DuckDBPyConnection, pipe_id: int) -> tuple[Observation, ...]:
    rows = con.execute(
        """
        select run_date, segment_id, y_min_residual_mm, had_defect, n_metal_loss, max_depth_pct
        from mart.ili_segment
        where pipe_id = $pipe and is_training_eligible and y_min_residual_mm is not null
        order by run_date, segment_id
        """,
        {"pipe": pipe_id},
    ).fetchall()
    return tuple(
        Observation(r[0], int(r[1]), float(r[2]), bool(r[3]), int(r[4] or 0), _float(r[5]))
        for r in rows
    )


def _forecasts(con: duckdb.DuckDBPyConnection, path: Path, pipe_id: int) -> tuple[Forecast, ...]:
    rows = con.execute(
        """
        select segment_id, thickness_pred, p05, p10, p90, p95
        from read_csv($path, header = true) where id = $pipe order by segment_id
        """,
        {"path": str(path), "pipe": pipe_id},
    ).fetchall()
    return tuple(
        Forecast(int(r[0]), float(r[1]), float(r[2]), float(r[3]), float(r[4]), float(r[5]))
        for r in rows
    )


def _features(
    con: duckdb.DuckDBPyConnection, path: Path, pipe_id: int
) -> tuple[SegmentFeatures, ...]:
    query = "select * from read_csv($path, header = true) where id = $pipe order by segment_id"
    params = {"path": str(path), "pipe": pipe_id}
    described = con.execute(f"describe {query}", params).fetchall()
    names = [
        str(row[0])
        for row in described
        if str(row[0]) not in KEY_COLUMNS and str(row[1]).startswith(NUMERIC_TYPES)
    ]
    columns = ", ".join(f'"{name}"' for name in names)
    rows = con.execute(
        f"select segment_id, {columns} from read_csv($path, header = true) "
        "where id = $pipe order by segment_id",
        params,
    ).fetchall()
    return tuple(
        SegmentFeatures(
            int(row[0]),
            tuple(
                FeatureValue(name, _float(value))
                for name, value in zip(names, row[1:], strict=True)
            ),
        )
        for row in rows
    )


def load_target(
    con: duckdb.DuckDBPyConnection,
    case: TargetCase,
    runs: tuple[InspectionRun, ...],
    uncertainty: Path,
    features: Path,
) -> TargetPipe | str:
    passport = _passport(con, case.pipe_id)
    if passport is None:
        return f"pipe {case.pipe_id}: missing in core.pipe"
    return TargetPipe(
        case=case,
        passport=passport,
        segments=_segments(con, case.pipe_id),
        forecasts=_forecasts(con, uncertainty, case.pipe_id),
        runs=tuple(run for run in runs if run.pipe_id == case.pipe_id),
        observations=_observations(con, case.pipe_id),
        features=_features(con, features, case.pipe_id),
    )
