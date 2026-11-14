"""Лаборатория, серия 55: статистики распределения дефектов прошлого пропуска (кейс 1).

ИТОГ (боевой бленд кейса 1, сиды 42/7/2024; ref 0.6172/0.6198/0.6197, mean 0.6189,
MAE 0.279, r2d (без бездефектных сегментов) 0.2295):
  quant  (q10/q25/медиана остаточной толщины, средняя глубина)  0.6349/0.6311/0.6350 mean 0.6336,
         MAE 0.264, r2d 0.2603 — ПРИНЯТ: 8/8 сидов (0.6182 -> 0.6350), выше всех 5 нуль-
         перестановок (max 0.6198), self22 0.018 -> 0.021 (lab58). Встроен: prev_q10/q25/qmed/
         prev_mean_depth в features.start_state_features, QUANT_FEATS кейсу 1.
  bottom (донные 120-240°, внешние)   mean 0.6235 r2d 0.239 — 3/3, но +0.005 < нуля, q+bot 0.616 — отказ.
  morph 0.594, rank 0.590 (MAE 0.40), win ±1/±2/±5 0.510, winbot 0.599, nbdiff 0.582,
  all 0.554, quant+win 0.575 — отказ (окна по соседним сегментам рушат форму: r2d 0.09).
Запуск: r.sh experiments/lab55_defect_stats.py lab55 (taskset 40-47, OMP 8).
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import featlab as L  # noqa: E402
from pipetwin import features as F  # noqa: E402

WINS = (3, 5, 11)  # ±1, ±2, ±5 сегментов


def seg_stats(sub, n, wt, ctx) -> pd.DataFrame:
    """Посегментные статистики дефектов прошлого пропуска + окна + разности с соседями."""
    seg = pd.DataFrame({"segment_id": np.arange(n)})
    if sub is None or sub.empty:
        # «виртуальный пропуск» на вводе: дефектов нет, толщины номинальные
        for c in COLS_ZERO:
            seg[c] = 0.0
        for c in COLS_NOM:
            seg[c] = wt
        for c in COLS_NAN:
            seg[c] = np.nan
        return seg
    d = sub.dropna(subset=["Residual Wall Thickness"]).copy()
    d["bottom"] = d["Angle"].between(120, 240)
    d["ext"] = d["Defect Type"] == "external"
    d["area"] = d["Feature Length"] * d["Feature Width"]
    g = d.groupby("segment_id")
    rw = g["Residual Wall Thickness"]
    st = pd.DataFrame({
        "ds_q10": rw.quantile(0.10), "ds_q25": rw.quantile(0.25), "ds_med": rw.median(),
        "ds_mean_depth": g["Defect Depth in %"].mean(),
        "ds_maxlen": g["Feature Length"].max(), "ds_maxwid": g["Feature Width"].max(),
        "ds_sumarea": g["area"].sum(),
        "ds_nbot": g["bottom"].sum(), "ds_botshare": g["bottom"].mean(),
        "ds_next": g["ext"].sum(),
        "ds_spread": g["Distance"].std(),  # кластеризация: разброс позиций внутри сегмента
    })
    bot = d[d["bottom"]].groupby("segment_id")["Residual Wall Thickness"].min()
    st["ds_botmin"] = bot
    mx1 = d.assign(b=np.floor(d["Distance"])).groupby(["segment_id", "b"]).size()
    st["ds_maxper1m"] = mx1.groupby(level=0).max()
    seg = seg.merge(st, left_on="segment_id", right_index=True, how="left")
    for c in COLS_ZERO:
        seg[c] = seg[c].fillna(0.0) if c in seg else 0.0
    for c in ("ds_q10", "ds_q25", "ds_med", "ds_botmin"):
        seg[c] = seg[c].fillna(wt)

    nd = d.groupby("segment_id").size().reindex(seg["segment_id"]).fillna(0).values
    seg["ds_logn"] = np.log1p(nd)
    tot = max(nd.sum(), 1.0)
    # нормировка на чувствительность снаряда: перцентиль сегмента внутри пропуска
    seg["ds_rank_n"] = pd.Series(nd).rank(pct=True).values
    seg["ds_rank_q10"] = (-seg["ds_q10"]).rank(pct=True).values
    mn = seg["ds_q10"].values
    for w in WINS:
        r = pd.Series(nd).rolling(w, center=True, min_periods=1)
        seg[f"ds_n_w{w}"] = r.sum().values / tot * 1000
        seg[f"ds_min_w{w}"] = pd.Series(mn).rolling(w, center=True, min_periods=1).min().values
        seg[f"ds_nbot_w{w}"] = seg["ds_nbot"].rolling(w, center=True, min_periods=1).sum().values
        seg[f"ds_occ_w{w}"] = pd.Series((nd > 0).astype(float)).rolling(
            w, center=True, min_periods=1).mean().values
    seg["ds_dmin_nb"] = mn - seg["ds_min_w3"].values  # ≥0: сосед глубже
    seg["ds_dn_nb"] = nd - pd.Series(nd).rolling(3, center=True, min_periods=1).mean().values
    return seg


COLS_ZERO = ["ds_mean_depth", "ds_maxlen", "ds_maxwid", "ds_sumarea", "ds_nbot", "ds_botshare",
             "ds_next", "ds_spread", "ds_maxper1m"]
COLS_NOM = ["ds_q10", "ds_q25", "ds_med", "ds_botmin"] + [f"ds_min_w{w}" for w in WINS]
COLS_NAN = ["ds_logn", "ds_rank_n", "ds_rank_q10", "ds_dmin_nb", "ds_dn_nb"] + [
    f"ds_{k}_w{w}" for k in ("n", "nbot", "occ") for w in WINS]

GROUPS = {
    "quant": ["ds_q10", "ds_q25", "ds_med", "ds_mean_depth"],
    "morph": ["ds_maxlen", "ds_maxwid", "ds_sumarea", "ds_spread", "ds_maxper1m"],
    "bottom": ["ds_nbot", "ds_botshare", "ds_botmin", "ds_next"],
    "rank": ["ds_rank_n", "ds_rank_q10", "ds_logn"],
    "win": [f"ds_{k}_w{w}" for k in ("n", "min", "occ") for w in WINS],
    "winbot": [f"ds_nbot_w{w}" for w in WINS],
    "nbdiff": ["ds_dmin_nb", "ds_dn_nb"],
}


def main():
    ds = L.build(extra_state=seg_stats, tag="lab55")
    for c in COLS_NAN:  # comm2vtd: окна/ранги нулевые
        ds[c] = ds[c].fillna(0.0)
    f1 = L.base_feats(ds, "case1")
    L.log("ref", L.fmt(L.eval_case1(ds, f1)))
    variants = dict(GROUPS)
    variants["all"] = sum(GROUPS.values(), [])
    variants["quant+win"] = GROUPS["quant"] + GROUPS["win"]
    for name, extra in variants.items():
        L.log(name, L.fmt(L.eval_case1(ds, f1 + extra)))


if __name__ == "__main__":
    main()
