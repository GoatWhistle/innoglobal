import threading
from decimal import Decimal
from pathlib import Path

import duckdb
import sqlglot
from sqlglot import exp

from app.domain.errors import InvalidQuestion
from app.domain.inference import JsonSchema

SOURCES = {
    "pipes": "core.pipe",
    "segments": "core.segment",
    "inspections": "mart.ili_segment",
    "regime_daily": "core.regime_daily",
    "regime_monthly": "mart.regime_monthly",
    "coupons": "core.corrosion_coupon",
}
DATES = {
    "inspections": "run_date",
    "regime_daily": "calc_date",
    "regime_monthly": "month",
    "coupons": "removed_at",
}
FUNCTIONS = {
    "AND",
    "OR",
    "NOT",
    "CASE",
    "IF",
    "COUNT",
    "MIN",
    "MAX",
    "AVG",
    "SUM",
    "MEDIAN",
    "ROUND",
    "ABS",
    "COALESCE",
    "NULLIF",
    "CAST",
    "TRY_CAST",
    "DATE_TRUNC",
    "DATEDIFF",
    "LAG",
    "LEAD",
    "STDDEV",
    "STDDEV_SAMP",
    "PERCENTILE_CONT",
    "QUANTILE_CONT",
}


def validate_sql(sql: str) -> None:
    try:
        statements = sqlglot.parse(sql, read="duckdb")
    except sqlglot.errors.ParseError as exc:
        raise InvalidQuestion("Invalid SQL") from exc
    if len(statements) != 1 or not isinstance(statements[0], exp.Select):
        raise InvalidQuestion("Only one SELECT is allowed")
    tree = statements[0]
    if tree.args.get("into") or any(tree.find_all(exp.Command, exp.Insert, exp.Delete, exp.Update)):
        raise InvalidQuestion("Only read queries are allowed")
    ctes = {node.alias for node in tree.find_all(exp.CTE)}
    for table in tree.find_all(exp.Table):
        if not isinstance(table.this, exp.Identifier) or table.catalog:
            raise InvalidQuestion("Table functions are unavailable")
        if table.name not in ctes and (table.db != "analytics" or table.name not in SOURCES):
            raise InvalidQuestion("Use the analytics catalog")
    for function in tree.find_all(exp.Func):
        if function.sql_name() not in FUNCTIONS:
            raise InvalidQuestion("Unsupported SQL function")


def query(root: Path, sql: str, cutoff: str) -> JsonSchema:
    validate_sql(sql)
    con = duckdb.connect(":memory:", config={"memory_limit": "256MB", "threads": 2})
    timer = threading.Timer(5, con.interrupt)
    try:
        warehouse = str(root / "warehouse/pipetwin.duckdb").replace("'", "''")
        con.execute(f"attach '{warehouse}' as source (read_only)")
        con.execute("create schema analytics")
        for name, table in SOURCES.items():
            where = f" where {DATES[name]} <= DATE '{cutoff}'" if name in DATES else ""
            con.execute(f"create view analytics.{name} as select * from source.{table}{where}")
        con.execute("set enable_external_access=false")
        con.execute("set lock_configuration=true")
        timer.start()
        cursor = con.execute(f"select * from ({sql}) as result limit 50001")
        columns = [column[0] for column in cursor.description]
        rows = cursor.fetchall()
        if len(rows) > 50000:
            raise InvalidQuestion("Aggregate the query or narrow its range")
        return {
            "columns": columns,
            "rows": [
                dict(
                    zip(
                        columns,
                        (float(v) if isinstance(v, Decimal) else v for v in row),
                        strict=True,
                    )
                )
                for row in rows
            ],
            "row_count": len(rows),
            "sql": sql,
        }
    except duckdb.Error as exc:
        raise InvalidQuestion("Query failed or exceeded its execution budget") from exc
    finally:
        timer.cancel()
        con.close()
