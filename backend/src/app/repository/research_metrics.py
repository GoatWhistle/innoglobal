import csv
import math
from datetime import date, datetime
from pathlib import Path
from statistics import mean, median, pstdev

import duckdb

from app.domain.cases import TARGET_CASES
from app.domain.inference import JsonSchema
from app.repository.research_sql import SOURCES, query

UNITS = {
    "pipe_id": "identifier",
    "segment_id": "identifier",
    "watercut_pct": "%",
    "slope_pct": "%",
    "max_depth_pct": "%",
    "wt_nom_mm": "mm",
    "d_mm": "mm",
    "y_min_residual_mm": "mm",
    "p_start_atm": "atm",
    "p_end_atm": "atm",
    "v_liquid_m_s": "m/s",
    "v_mix_m_s": "m/s",
    "rate_avg_mm_y": "mm/year",
    "rate_max_mm_y": "mm/year",
    "ph": "pH",
    "q_liquid": "source_unspecified",
}


def unit(name: str, kind: str) -> str:
    if name in UNITS:
        return UNITS[name]
    for suffix, label in (
        ("_mm", "mm"),
        ("_m", "m"),
        ("_pct", "%"),
        ("_mg_l", "mg/L"),
        ("_mm_y", "mm/year"),
        ("_c", "°C"),
        ("_atm", "atm"),
    ):
        if name.endswith(suffix):
            return label
    if "DATE" in kind or "TIMESTAMP" in kind:
        return "ISO-8601"
    if kind == "BOOLEAN":
        return "boolean"
    return "source_unspecified"


def catalog(root: Path, table: str | None = None) -> JsonSchema:
    with duckdb.connect(str(root / "warehouse/pipetwin.duckdb"), read_only=True) as con:
        items = []
        for alias, source in SOURCES.items():
            if table and table.removeprefix("analytics.") != alias:
                continue
            schema, name = source.split(".")
            rows = con.execute(
                "select column_name, data_type, comment from duckdb_columns() "
                "where schema_name=? and table_name=? order by column_index",
                [schema, name],
            ).fetchall()
            items.append(
                {
                    "table": "analytics." + alias,
                    "columns": [
                        {
                            "name": n,
                            "type": t,
                            "unit": unit(n, t),
                            **({"description": c} if table else {}),
                        }
                        for n, t, c in rows
                    ],
                }
            )
    return {
        "tables": items,
        "semantics": [
            "Regime fields are hydraulic calculations unless explicitly labelled fact.",
            "ILI values with had_defect=false use run wall mode; not measured local wall thickness.",
            "Coupon chemistry has link_level and linked_pipe_id; not necessarily local measurements.",
            "source_unspecified means the source does not establish a verified unit.",
        ],
    }


def statistics(rows: list[JsonSchema], columns: list[str]) -> JsonSchema:
    result: JsonSchema = {}
    for column in columns:
        values = [row.get(column) for row in rows]
        present = [v for v in values if v is not None]
        numbers = [
            float(v)
            for v in present
            if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)
        ]
        item: JsonSchema = {"count": len(values), "null_count": len(values) - len(present)}
        if column in ("id", "pipe_id", "segment_id"):
            item.update(kind="identifier", distinct=len(set(present)))
        elif numbers and len(numbers) == len(present):
            ordered = sorted(numbers)

            def quantile(p: float, ordered: list[float] = ordered) -> float:
                index = (len(ordered) - 1) * p
                lo = int(index)
                hi = min(lo + 1, len(ordered) - 1)
                return ordered[lo] + (ordered[hi] - ordered[lo]) * (index - lo)

            item.update(
                min=min(numbers),
                max=max(numbers),
                mean=mean(numbers),
                median=median(numbers),
                stddev=pstdev(numbers),
                p10=quantile(0.1),
                p90=quantile(0.9),
                unit=unit(column, "DOUBLE"),
            )
        elif present and all(isinstance(v, (date, datetime)) for v in present):
            item.update(min=str(min(present)), max=str(max(present)), unit="ISO-8601")
        elif present:
            from collections import Counter

            counts = Counter(str(v) for v in present)
            item.update(distinct=len(counts), most_common=counts.most_common(5))
        result[column] = item
    return result


def compare(root: Path, pipe_ids: list[int], cutoff: str) -> JsonSchema:
    items = []
    forecast_rows: list[dict[str, str]] = []
    if (root / "result.csv").is_file():
        with (root / "result.csv").open() as handle:
            forecast_rows = list(csv.DictReader(handle))
    forecast_dates = {case.pipe_id: case.target_date.isoformat() for case in TARGET_CASES}
    for pipe_id in pipe_ids:
        passport = query(
            root,
            "select pipe_id, direction, wt_nom_mm, d_mm, commissioned_at, "
            f"profile_length_m from analytics.pipes where pipe_id={int(pipe_id)}",
            cutoff,
        )["rows"]
        if not passport:
            continue
        item = passport[0]
        runs = query(
            root,
            "select run_date, count(*) as segments, "
            "avg(y_min_residual_mm) as mean_residual_mm, min(y_min_residual_mm) as min_residual_mm, "
            "sum(n_metal_loss) as defects, sum(case when had_defect then 1 else 0 end) "
            f"as detected_segments from analytics.inspections where pipe_id={int(pipe_id)} "
            "and is_training_eligible group by run_date order by run_date",
            cutoff,
        )["rows"]
        item["inspection_count"] = len(runs)
        item["cutoff_date"] = cutoff
        nominal = item["wt_nom_mm"]
        last = runs[-1] if runs else None
        item["last_inspection"] = last
        item["min_residual_fraction"] = (
            last["min_residual_mm"] / nominal if last and nominal else None
        )
        length = item["profile_length_m"]
        item["defects_per_km"] = last["defects"] * 1000 / length if last and length else None
        item["historical_mean_change_mm_year"] = None
        if len(runs) >= 2:
            years = (runs[-1]["run_date"] - runs[-2]["run_date"]).days / 365.25
            if years > 0:
                item["historical_mean_change_mm_year"] = (
                    runs[-2]["mean_residual_mm"] - runs[-1]["mean_residual_mm"]
                ) / years
        item["age_years"] = (
            (date.fromisoformat(cutoff) - item["commissioned_at"]).days / 365.25
            if item["commissioned_at"]
            else None
        )
        coverage = query(
            root,
            "select count(*) as days, min(calc_date) as first_date, "
            "max(calc_date) as last_date, avg(v_liquid_m_s) as mean_velocity_m_s, "
            f"avg(watercut_pct) as mean_watercut_pct from analytics.regime_daily where pipe_id={int(pipe_id)}",
            cutoff,
        )
        item["regime"] = coverage["rows"][0]
        forecast_date = forecast_dates.get(pipe_id)
        predictions = [float(r["thickness_pred"]) for r in forecast_rows if int(r["id"]) == pipe_id]
        item["forecast"] = (
            {
                "date": forecast_date,
                "kind": "forecast",
                "segments": len(predictions),
                "min_mm": min(predictions),
                "median_mm": median(predictions),
                "mean_mm": mean(predictions),
                "source": "result.csv",
            }
            if predictions and forecast_date and forecast_date <= cutoff
            else None
        )
        items.append(item)
    return {
        "items": items,
        "limits": [
            "No universal quality score. Inspect survey dates and coverage before comparing.",
            "Historical mean change is a difference of run summaries, not a local corrosion rate.",
            "Negative historical change is retained; inspection noise can make walls appear thicker.",
            "No defect does not mean local thickness was measured. Missing history remains null.",
        ],
    }
