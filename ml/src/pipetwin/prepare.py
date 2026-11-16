"""Чтение очищенного слоя хранилища (core), сегментация, посегментные таргеты, обучающие пары."""
import numpy as np
import pandas as pd

from . import config as C
from . import warehouse as W


def load_passport() -> pd.DataFrame:
    return W.query("""
        select pipe_id as id, direction, d_mm, wt_nom_mm as wt_nom,
               commissioned_at as date_in, has_inner_coating as coated
        from core.pipe order by pipe_id""")


def load_altitudes() -> pd.DataFrame:
    return W.query("""
        select pipe_id as id, lon, lat, z_m as z, dist_m as total_distance
        from core.route_point order by pipe_id, dist_m""")


def n_segments(altitudes: pd.DataFrame) -> pd.Series:
    """Число 10-метровых сегментов на участок — по максимальной дистанции профиля."""
    return (altitudes.groupby("id")["total_distance"].max() // C.SEG_LEN).astype(int) + 1


def load_vtd() -> pd.DataFrame:
    """Очищенные особенности ВТД (core.ili_feature): без дефектов за пределами трубы
    и дублей, глубина в % во всех пропусках (в 2018 была записана долей)."""
    return W.query("""
        select pipe_id as id, run_date, dist_m as "Distance", segment_id,
               defect_side as "Defect Type", wall_mm as "Wall Thickness",
               residual_mm as "Residual Wall Thickness", depth_pct as "Defect Depth in %",
               length_mm as "Feature Length", width_mm as "Feature Width", angle_deg as "Angle"
        from core.ili_feature order by pipe_id, run_date, dist_m""")


def build_runs(vtd: pd.DataFrame | None = None) -> pd.DataFrame:
    """Пропуски ВТД (core.ili_run): число дефектов, модальная стенка, пригодность.

    Пропуск раньше даты ввода трубы (ВТД старой, заменённой трубы) помечен
    is_training_eligible = false и в пары не попадает.
    """
    return W.query("""
        select pipe_id as id, run_date, n_metal_loss as n_defects,
               wall_mode_mm as wall_mode, is_training_eligible
        from core.ili_run order by pipe_id, run_date""")


def segment_targets(vtd: pd.DataFrame, runs: pd.DataFrame, nseg: pd.Series,
                    pipe_id: int, run_date: pd.Timestamp) -> pd.DataFrame:
    """Таргет пропуска: минимальная остаточная толщина по каждому сегменту.

    Допущение: сегмент без зарегистрированных дефектов получает модальную
    толщину стенки этого пропуска (прибор не увидел утонения глубже порога).
    """
    sub = vtd[(vtd["id"] == pipe_id) & (vtd["run_date"] == run_date)]
    wall = runs.set_index(["id", "run_date"]).loc[(pipe_id, run_date), "wall_mode"]
    g = sub.dropna(subset=["Residual Wall Thickness"]).groupby("segment_id")[
        "Residual Wall Thickness"]
    segs = pd.DataFrame({"segment_id": np.arange(nseg.loc[pipe_id])})
    segs["id"] = pipe_id
    segs["y"] = segs["segment_id"].map(g.min())
    segs["had_defect"] = segs["y"].notna()
    segs["y"] = segs["y"].fillna(wall)
    return segs


def build_pairs(runs: pd.DataFrame, passport: pd.DataFrame) -> pd.DataFrame:
    """Обучающие пары «старт -> целевой пропуск»: все комбинации (ввод -> ВТД j) и (ВТД i -> ВТД j),
    i < j. Пропуски, непригодные для обучения (core.ili_run.is_training_eligible), исключаются.
    """
    pas = passport.set_index("id")
    rows = []
    for pipe_id, grp in runs[runs["is_training_eligible"]].groupby("id"):
        dates = sorted(grp["run_date"])
        comm = pas.loc[pipe_id, "date_in"]
        starts = [(comm, "comm2vtd")] + [(d, "vtd2vtd") for d in dates]
        for (s, kind), e in (
            ((s, k), e) for s, k in starts for e in dates
            if k == "comm2vtd" or s < e
        ):
            rows.append(dict(id=pipe_id, start=s, end=e, kind=kind))
    return pd.DataFrame(rows)


def prediction_pairs(passport: pd.DataFrame) -> pd.DataFrame:
    """Две целевые пары, для которых сдаётся прогноз."""
    pas = passport.set_index("id")
    return pd.DataFrame(
        [
            dict(id=C.CASE1_ID, start=pd.Timestamp(C.CASE1_PREV_RUN),
                 end=pd.Timestamp(C.CASE1_T), kind="vtd2vtd"),
            dict(id=C.CASE2_ID, start=pas.loc[C.CASE2_ID, "date_in"],
                 end=pd.Timestamp(C.CASE2_T), kind="comm2vtd"),
        ]
    )
