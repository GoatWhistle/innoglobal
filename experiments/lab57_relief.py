"""Лаборатория, серия 57: рельеф — низины/карманы, кривизна, расстояние до низины,
накопленный подъём, угол наклона × режим течения (кейс 1 и кейс 2).

ИТОГ (ref c1 mean 0.6189 r2d 0.2295; c2 0.1813):
  curv 0.597/c2 0.178, lows 0.583/0.167, climb 0.620 (r2d 0.232)/0.143, angle 0.598/0.2018,
  angle_x 0.584/0.174, all 0.636 (r2d 0.268)/0.123.
  Кейс 1 all +0.017 при том, что каждая группа по отдельности не лучше ref — признак отбора
  по шуму; self22 (lab58) all 0.018 -> 0.003 — ОТКАЗ. Кейс 2 angle +0.02 выше нуля (perm
  max 0.153), но при строгой валидации (PIPETWIN_VAL2_STRICT=1, без самой трубы в train)
  0.0098 -> 0.0009: это «отпечаток» трубы 22871 (сглаженный наклон), не физика — ОТКАЗ.
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import featlab as L  # noqa: E402
from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402


def _dist_to(mask: np.ndarray) -> np.ndarray:
    """Расстояние (сегменты) до ближайшего True; без True — длина трубы."""
    n = len(mask)
    idx = np.flatnonzero(mask)
    if not len(idx):
        return np.full(n, float(n))
    pos = np.arange(n)
    j = np.searchsorted(idx, pos)
    left = np.where(j > 0, pos - idx[np.clip(j - 1, 0, None)], n)
    right = np.where(j < len(idx), idx[np.clip(j, None, len(idx) - 1)] - pos, n)
    return np.minimum(left, right).astype(float)


def relief(geom: pd.DataFrame) -> pd.DataFrame:
    out = []
    for pid, g in geom.groupby("id"):
        g = g.sort_values("segment_id")
        z = pd.Series(g["z"].values)
        zs = z.rolling(5, center=True, min_periods=1).mean()
        df = pd.DataFrame({"id": pid, "segment_id": g["segment_id"].values})
        d1 = np.gradient(zs.values, C.SEG_LEN)
        df["rl_angle"] = np.degrees(np.arctan(d1))
        df["rl_curv"] = np.gradient(d1, C.SEG_LEN) * 1000  # >0 — вогнутость (дно чаши)
        df["rl_curv_w"] = pd.Series(df["rl_curv"]).rolling(11, center=True, min_periods=1).mean()
        # локальные минимумы сглаженного профиля с «глубиной» ≥ 0.3 м в окне ±10 сегм.
        lo = (zs == zs.rolling(21, center=True, min_periods=1).min()).values
        rise = (zs.rolling(21, center=True, min_periods=1).max() - zs).values
        lows = lo & (rise >= 0.3)
        df["rl_dist_low"] = _dist_to(lows)
        # ниже по потоку/выше по потоку
        df["rl_is_low"] = lows.astype(float)
        # накопленный подъём от последнего минимума вверх по потоку (зона расслоения)
        runmin = zs.cummin()
        last_low_z = zs.where(lows).ffill().fillna(zs.iloc[0])
        df["rl_cum_rise"] = (zs - last_low_z).values
        df["rl_cum_up"] = pd.Series(np.clip(np.diff(zs.values, prepend=zs.values[0]), 0, None)
                                    ).rolling(30, min_periods=1).sum().values
        df["rl_cum_down"] = pd.Series(np.clip(-np.diff(zs.values, prepend=zs.values[0]), 0, None)
                                      ).rolling(30, min_periods=1).sum().values
        # «критический угол» накопления воды на восходящем участке: 0.5-5 град
        df["rl_crit_up"] = ((df["rl_angle"] > 0.3) & (df["rl_angle"] < 5)).astype(float)
        df["rl_low_w100"] = (zs - zs.rolling(11, center=True, min_periods=1).min()).values
        df["rl_zmin_run"] = (zs - runmin).values
        out.append(df)
    return pd.concat(out, ignore_index=True)


GROUPS = {
    "curv": ["rl_curv", "rl_curv_w"],
    "lows": ["rl_dist_low", "rl_is_low", "rl_low_w100"],
    "climb": ["rl_cum_rise", "rl_cum_up", "rl_cum_down", "rl_zmin_run"],
    "angle": ["rl_angle", "rl_crit_up"],
    "angle_x": ["rl_angle_x_lam", "rl_angle_x_slow"],
}


def main():
    ds = L.build(extra_geom=relief, tag="lab57")
    ds["rl_angle_x_lam"] = ds["rl_angle"] * ds["rg_share_laminar"]
    ds["rl_angle_x_slow"] = ds["rl_angle"] * ds["rg_share_slow"]
    f1, f2 = L.base_feats(ds, "case1"), L.base_feats(ds, "case2")
    L.log("ref c1", L.fmt(L.eval_case1(ds, f1)), "c2", L.eval_case2(ds, f2))
    variants = dict(GROUPS)
    variants["all"] = sum(GROUPS.values(), [])
    for name, extra in variants.items():
        L.log(name, "c1", L.fmt(L.eval_case1(ds, f1 + extra)), "c2", L.eval_case2(ds, f2 + extra))


if __name__ == "__main__":
    main()
