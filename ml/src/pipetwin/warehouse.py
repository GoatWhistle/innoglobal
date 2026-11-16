"""Доступ к аналитическому хранилищу (DuckDB).

Модель читает только очищенный слой core. Если базы нет или исходные CSV/SQL новее файла,
хранилище пересобирается (ml/warehouse/build.py, ~2 с).
"""
import importlib.util

import duckdb
import pandas as pd

from . import config as C


def _stale() -> bool:
    if not C.WAREHOUSE_DB.exists():
        return True
    db_mtime = C.WAREHOUSE_DB.stat().st_mtime
    sources = list(C.INPUT_DIR.glob("*.csv")) + list((C.WAREHOUSE_CODE / "sql").glob("*.sql"))
    return any(f.stat().st_mtime > db_mtime for f in sources)


def build(force: bool = False) -> None:
    """Пересобрать хранилище (raw -> core -> mart + проверки качества), если нужно."""
    if not force and not _stale():
        return
    spec = importlib.util.spec_from_file_location("wh_build", C.WAREHOUSE_CODE / "build.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    C.WAREHOUSE_DB.parent.mkdir(parents=True, exist_ok=True)
    if mod.build(C.WAREHOUSE_DB, C.INPUT_DIR) != 0:
        raise RuntimeError("хранилище собрано с ошибками DQ уровня error, см. dq.check_result")


def query(sql: str) -> pd.DataFrame:
    build()
    with duckdb.connect(str(C.WAREHOUSE_DB), read_only=True) as con:
        df = con.execute(sql).df()
    for col in df.columns:  # DATE из DuckDB -> datetime64[ns]
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = pd.to_datetime(df[col]).astype("datetime64[ns]")
    return df
