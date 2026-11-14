"""Сборка аналитического хранилища PipeTwin (DuckDB): raw -> core -> mart + DQ.

Запуск:  uvx --with duckdb python warehouse/build.py [--db PATH] [--data DIR]
"""
import argparse
import sys
import time
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[1]
SQL_DIR = Path(__file__).resolve().parent / "sql"

# (имя, уровень, SQL числа нарушений, SQL знаменателя, смысл)
# error — нарушен контракт слоя (сборка падает); warn — проблема данных, учтена очисткой;
# info — наблюдение для аналитика.
CHECKS = [
    # --- сверка: ни одна строка raw не потеряна молча (core + quarantine = raw)
    ("recon.vtd", "error",
     "select abs((select count(*) from raw.vtd_south_train) - (select count(*) from core.ili_feature)"
     " - (select count(*) from quarantine.ili_feature))",
     "select count(*) from raw.vtd_south_train", "raw = core + quarantine"),
    ("recon.altitudes", "error",
     "select abs((select count(*) from raw.altitudes_south) - (select count(*) from core.route_point)"
     " - (select count(*) from quarantine.route_point))",
     "select count(*) from raw.altitudes_south", "raw = core + quarantine"),
    ("recon.regime", "error",
     "select abs((select count(*) from raw.tech_mode) - (select count(*) from core.regime_daily)"
     " - (select count(*) from quarantine.regime_daily))",
     "select count(*) from raw.tech_mode", "raw = core + quarantine"),
    ("recon.pipe", "error",
     "select abs((select count(*) from raw.pot_south) - (select count(*) from core.pipe))",
     "select count(*) from raw.pot_south", "raw = core"),
    ("recon.uzt", "error",
     "select abs((select count(*) from raw.uzt_south) - (select count(*) from core.ut_measurement))",
     "select count(*) from raw.uzt_south", "raw = core"),
    ("recon.repcorr", "error",
     "select abs((select count(*) from raw.repcorr_south) - (select count(*) from core.corrosion_coupon))",
     "select count(*) from raw.repcorr_south", "raw = core"),

    # --- ключи и ссылки
    ("pk.pipe", "error",
     "select count(*) - count(distinct pipe_id) + count(*) filter (where pipe_id is null) from core.pipe",
     "select count(*) from core.pipe", "pipe_id уникален и не NULL"),
    ("pk.regime_daily", "error",
     "select count(*) - count(distinct (pipe_id, calc_date)) from core.regime_daily",
     "select count(*) from core.regime_daily", "одна строка на сутки × участок"),
    ("pk.ili_run", "error",
     "select count(*) - count(distinct (pipe_id, run_date)) from core.ili_run",
     "select count(*) from core.ili_run", "один пропуск на дату × участок"),
    ("pk.ili_segment", "error",
     "select count(*) - count(distinct (pipe_id, run_date, segment_id)) from mart.ili_segment",
     "select count(*) from mart.ili_segment", "сегмент × пропуск уникален"),
    ("fk.ili_feature.pipe", "error",
     "select count(*) from core.ili_feature where pipe_id not in (select pipe_id from core.pipe)",
     "select count(*) from core.ili_feature", "участок есть в паспорте"),
    ("fk.regime.pipe", "error",
     "select count(*) from core.regime_daily where pipe_id not in (select pipe_id from core.pipe)",
     "select count(*) from core.regime_daily", "участок есть в паспорте"),
    ("fk.ili_feature.segment", "error",
     "select count(*) from core.ili_feature f anti join core.segment s using (pipe_id, segment_id)",
     "select count(*) from core.ili_feature", "дефект попадает в сегмент сетки"),

    # --- ВТД
    ("ili.quarantine.out_of_pipe_bounds", "warn",
     "select count(*) from quarantine.ili_feature where reason = 'out_of_pipe_bounds'",
     "select count(*) from raw.vtd_south_train", "дистанция < 0 или за концом профиля"),
    ("ili.quarantine.beyond_pot_flag", "warn",
     "select count(*) from quarantine.ili_feature where reason = 'beyond_pot_flag'",
     "select count(*) from raw.vtd_south_train", "организаторы пометили is_beyond_pot"),
    ("ili.quarantine.duplicate", "warn",
     "select count(*) from quarantine.ili_feature where reason = 'duplicate'",
     "select count(*) from raw.vtd_south_train", "точные дубли дефекта"),
    ("ili.depth_scale_fraction", "warn",
     "select count(*) from core.ili_run where depth_scale_raw = 'fraction'",
     "select count(*) from core.ili_run", "пропуск записал глубину долей, пересчитано в %"),
    ("ili.depth_consistency", "warn",
     "select count(*) from core.ili_feature where is_metal_loss"
     " and abs(wall_mm * (1 - depth_pct / 100) - residual_mm) > 0.3",
     "select count(*) from core.ili_feature where is_metal_loss",
     "residual ≈ wall·(1 − depth%) после нормализации шкалы"),
    ("ili.run_predates_commissioning", "warn",
     "select count(*) from core.ili_run where predates_commissioning",
     "select count(*) from core.ili_run", "ВТД старой (заменённой) трубы, исключён из обучения"),
    ("ili.run_mixed_wall", "warn",
     "select count(*) from core.ili_run where n_distinct_wall > 1",
     "select count(*) from core.ili_run", "в пропуске несколько номиналов стенки"),
    ("ili.run_wall_vs_passport", "warn",
     "select count(*) from core.ili_run where abs(wall_mode_mm - wt_nom_mm) > 0.5",
     "select count(*) from core.ili_run", "модальная стенка пропуска ≠ паспорту"),
    ("ili.external_defects", "info",
     "select count(*) from core.ili_feature where defect_side = 'external'",
     "select count(*) from core.ili_feature where is_metal_loss", "внешняя коррозия (не внутренняя)"),

    # --- УЗТ
    ("ut.thicker_than_nominal", "warn",
     "select count(*) from core.ut_measurement where not is_plausible",
     "select count(*) from core.ut_measurement", "толщина > номинал·1.15 — физически невозможно"),

    # --- коррозионный мониторинг
    ("coupon.no_pipe_direction", "info",
     "select count(*) from core.corrosion_coupon where not matches_pipe_direction",
     "select count(*) from core.corrosion_coupon", "направление не из наших 16 участков / пусто"),
    ("coupon.exposure_mismatch", "warn",
     "select count(*) from core.corrosion_coupon where abs(exposure_days - exposure_days_calc) > 2",
     "select count(*) from core.corrosion_coupon where exposure_days is not null"
     " and exposure_days_calc is not null", "дни экспозиции ≠ снятие − установка"),
    ("coupon.max_lt_avg", "warn",
     "select count(*) from core.corrosion_coupon where rate_max_mm_y < rate_avg_mm_y",
     "select count(*) from core.corrosion_coupon where rate_avg_mm_y is not null",
     "максимальная скорость < средней"),

    # --- техрежим
    ("regime.quarantine.duplicate_day", "warn",
     "select count(*) from quarantine.regime_daily where reason = 'duplicate_day_superseded'",
     "select count(*) from raw.tech_mode", "несколько расчётов за сутки, оставлен последний"),
    ("regime.anomaly_days", "warn",
     "select count(*) from core.regime_daily where has_anomaly",
     "select count(*) from core.regime_daily", "сбой расчёта: давление/скорость/расход вне физики"),
    ("regime.p_start_null", "warn",
     "select count(*) from core.regime_daily where p_start_atm is null",
     "select count(*) from core.regime_daily", "давление отсутствует (0 или вне допустимого)"),
    ("regime.t_mix_null", "warn",
     "select count(*) from core.regime_daily where t_mix_c is null",
     "select count(*) from core.regime_daily", "температура = 0 / нет расчёта"),
    ("regime.downtime_days", "info",
     "select count(*) from core.regime_daily where is_downtime",
     "select count(*) from core.regime_daily", "простой (q = 0)"),
    ("regime.missing_days", "info",
     "select sum(datediff('day', d0, d1) + 1 - n) from (select pipe_id, min(calc_date) d0,"
     " max(calc_date) d1, count(*) n from core.regime_daily group by 1)",
     "select sum(datediff('day', d0, d1) + 1) from (select pipe_id, min(calc_date) d0,"
     " max(calc_date) d1 from core.regime_daily group by 1)", "дыры в суточном ряду"),
    ("regime.starts_after_commissioning", "info",
     "select count(*) from (select pipe_id, min(calc_date) d0 from core.regime_daily group by 1) r"
     " join core.pipe p using (pipe_id) where r.d0 > p.commissioned_at + interval 365 day",
     "select count(*) from core.pipe", "режим начинается позже ввода больше чем на год"),

    # --- паспорт / профиль
    ("pipe.length_passport_vs_profile", "warn",
     "select count(*) from core.pipe where abs(length_passport_m - profile_length_m)"
     " / length_passport_m > 0.02",
     "select count(*) from core.pipe", "длина по паспорту и по профилю расходятся > 2%"),
    ("segment.z_null", "error",
     "select count(*) from core.segment where z_center_m is null",
     "select count(*) from core.segment", "у сегмента есть высота"),
]


def build(db_path: Path, data_dir: Path) -> int:
    t0 = time.time()
    con = duckdb.connect(str(db_path))
    for f in sorted(SQL_DIR.glob("*.sql")):
        sql = f.read_text(encoding="utf-8").replace("{data_dir}", data_dir.as_posix())
        con.execute(sql)
        print(f"  ✓ {f.name}")

    con.execute("""
        create or replace table dq.check_result (
            checked_at timestamp, check_name varchar, severity varchar,
            n_failed bigint, n_total bigint, description varchar)""")
    rows = []
    for name, sev, q_fail, q_total, desc in CHECKS:
        n_fail = con.execute(q_fail).fetchone()[0] or 0
        n_total = con.execute(q_total).fetchone()[0] or 0
        rows.append((name, sev, int(n_fail), int(n_total), desc))
    con.executemany("insert into dq.check_result values (current_timestamp, ?, ?, ?, ?, ?)", rows)

    print("\nСлои:")
    for schema, table in con.execute("""
            select schema_name, table_name from duckdb_tables()
            where schema_name in ('raw','core','quarantine','mart')
              and not starts_with(table_name, '_')
            order by case schema_name when 'raw' then 0 when 'core' then 1
                     when 'quarantine' then 2 else 3 end, table_name""").fetchall():
        n = con.execute(f'select count(*) from "{schema}"."{table}"').fetchone()[0]
        print(f"  {schema + '.' + table:32s} {n:>8,}")

    print("\nКачество данных:")
    failed_errors = 0
    for name, sev, n_fail, n_total, desc in rows:
        if n_fail == 0:
            mark = "ok  "
        else:
            mark = {"error": "FAIL", "warn": "warn", "info": "info"}[sev]
        failed_errors += sev == "error" and n_fail > 0
        share = f"{n_fail / n_total:6.1%}" if n_total else "     -"
        print(f"  [{mark}] {name:36s} {n_fail:>7,} / {n_total:<7,} {share}  {desc}")

    con.close()
    print(f"\n{db_path} собрана за {time.time() - t0:.1f} с")
    return 1 if failed_errors else 0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", type=Path, default=ROOT / "warehouse" / "pipetwin.duckdb")
    ap.add_argument("--data", type=Path, default=ROOT / "data")
    args = ap.parse_args()
    sys.exit(build(args.db, args.data.resolve()))


if __name__ == "__main__":
    main()
