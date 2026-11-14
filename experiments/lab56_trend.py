"""Лаборатория, серия 56: рост между прошлыми пропусками — экстраполяция тренда (кейс 1).

Для пары с началом на пропуске R ищется более ранний пропуск R0 той же трубы (в координатах
профиля, align.to_profile; целевой пропуск валидации исключён из оценки сдвига). Если его
нет — «ввод» (номинал, без дефектов). Признаки: скорость потери металла между R0 и R
по сегменту (мм/год) и сглаженная, прирост числа дефектов, «новый» дефект, экстраполяция
prev_min − rate·horizon.

ИТОГ: отказ, структурно. В train нет ни одной пары с двумя прошлыми пропусками:
у всех vtd2vtd train старт = 2018, раньше только ввод -> «скорость» = потеря/возраст
(mean 0.064 мм/год), а у валидации/прогноза (старт 2022) — 2018->2022 (0.164, другой снаряд:
2257 vs 25989 дефектов). tr_dn: train 0.23, val 11.0 — сдвиг распределения на порядки.
Цифры: rate 0.5837, rate_extrap 0.6202, persist 0.6173, dn 0.6207, all 0.5876 (ref 0.6189) —
прирост extrap/dn +0.001-0.002 = шум (сырой ens не меняется: 0.3739).
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import featlab as L  # noqa: E402
from pipetwin import align, prepare  # noqa: E402
from pipetwin import config as C  # noqa: E402

YEAR = pd.Timedelta(days=365.25)


def trend(sub, n, wt, ctx) -> pd.DataFrame:
    seg = pd.DataFrame({"segment_id": np.arange(n)})
    if sub is None:
        for c in COLS:
            seg[c] = 0.0
        seg["tr_dt"] = np.nan
        return seg
    pid, start, vtd, runs, pas = ctx["pipe_id"], ctx["start"], ctx["vtd"], ctx["runs"], ctx["passport"]
    nseg = ctx["nseg"]
    cur = prepare.segment_targets(sub, runs, nseg, pid, start).set_index("segment_id")
    cur_n = sub.dropna(subset=["Residual Wall Thickness"]).groupby("segment_id").size()
    rr = runs[(runs["id"] == pid) & runs["is_training_eligible"] & (runs["run_date"] < start)]
    if len(rr):
        r0 = rr["run_date"].max()
        ex = pd.Timestamp(C.VAL_CASE1_END) if start == pd.Timestamp(C.VAL_CASE1_START) else None
        s0 = align.shifted_vtd(vtd, pid, r0, align.to_profile(vtd, pas, pid, r0, ex), n)
        old = prepare.segment_targets(s0, runs, nseg, pid, r0).set_index("segment_id")
        old_n = s0.dropna(subset=["Residual Wall Thickness"]).groupby("segment_id").size()
        dt = (start - r0) / YEAR
        y0, had0 = old["y"], old["had_defect"]
    else:
        dt = (start - pas.set_index("id").loc[pid, "date_in"]) / YEAR
        y0 = pd.Series(wt, index=cur.index)
        had0 = pd.Series(False, index=cur.index)
        old_n = pd.Series(dtype=float)
    seg["tr_dt"] = dt
    loss = (y0 - cur["y"]).reindex(seg["segment_id"]).values
    seg["tr_rate"] = np.clip(loss, 0, None) / dt
    seg["tr_rate_sm5"] = pd.Series(seg["tr_rate"]).rolling(5, center=True, min_periods=1).max().values
    seg["tr_rate_sm11"] = pd.Series(seg["tr_rate"]).rolling(11, center=True, min_periods=1).mean().values
    nn = cur_n.reindex(seg["segment_id"]).fillna(0).values
    on = old_n.reindex(seg["segment_id"]).fillna(0).values
    seg["tr_dn"] = (nn - on) / dt
    seg["tr_new"] = ((cur["had_defect"].reindex(seg["segment_id"]).values.astype(bool))
                     & ~had0.reindex(seg["segment_id"]).fillna(False).values.astype(bool)).astype(float)
    seg["tr_persist"] = ((cur["had_defect"].reindex(seg["segment_id"]).values.astype(bool))
                         & had0.reindex(seg["segment_id"]).fillna(False).values.astype(bool)).astype(float)
    seg["tr_persist_w5"] = pd.Series(seg["tr_persist"]).rolling(5, center=True, min_periods=1).max().values
    return seg


COLS = ["tr_rate", "tr_rate_sm5", "tr_rate_sm11", "tr_dn", "tr_new", "tr_persist", "tr_persist_w5"]
GROUPS = {
    "rate": ["tr_rate", "tr_rate_sm5", "tr_rate_sm11"],
    "rate_extrap": ["tr_extrap"],
    "persist": ["tr_new", "tr_persist", "tr_persist_w5"],
    "dn": ["tr_dn"],
}


def main():
    ds = L.build(extra_state=trend, tag="lab56")
    ds["tr_extrap"] = np.where(ds["has_prev"] == 1,
                               ds["prev_min"] - ds["tr_rate"] * ds["horizon_years"], ds["wt_nom"])
    va = ds[ds["split"] == "val_case1"]
    print(va[COLS + ["tr_dt"]].describe().T.round(3).to_string(), flush=True)
    f1 = L.base_feats(ds, "case1")
    L.log("ref", L.fmt(L.eval_case1(ds, f1)))
    variants = dict(GROUPS)
    variants["all"] = sum(GROUPS.values(), [])
    for name, extra in variants.items():
        L.log(name, L.fmt(L.eval_case1(ds, f1 + extra)))


if __name__ == "__main__":
    main()
