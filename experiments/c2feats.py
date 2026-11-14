"""Доп. признаки рельефа кейса 2 (lab36): физика карманов в координатах трубы.

Считаются по сегментному профилю z каждой трубы (сегменты упорядочены по
dist_m). Все признаки относительные — не идентифицируют трубу по абсолютной
отметке/дистанции (z, dist_m у 9583 вне диапазона обучения).
"""
import numpy as np
import pandas as pd

# признаки-идентификаторы трубы: абсолютная отметка, дистанция, T по дистанции
IDENTITY = ["z", "dist_m", "dist_frac", "t_at"]


def _per_pipe(g: pd.DataFrame) -> pd.DataFrame:
    g = g.sort_values("segment_id")
    z = pd.Series(g["z"].values)
    out = {}
    for w in (5, 11, 31, 101):
        sm = z.rolling(w, center=True, min_periods=1).mean()
        out[f"sag_{w}"] = (z - sm).values          # <0 — прогиб ниже окрестности
    zs = z.rolling(3, center=True, min_periods=1).mean()
    d1 = zs.diff().fillna(0.0)
    out["curv"] = zs.diff().diff().shift(-1).fillna(0.0).values  # >0 — вогнутость (дно)
    # V-дно: спуск слева и подъём справа (в окне 5 сегментов)
    left = zs - zs.shift(5)
    right = zs.shift(-5) - zs
    out["vbottom"] = (np.minimum(-left.fillna(0), right.fillna(0))).clip(lower=0).values
    # водосбор: длина непрерывного спуска, стекающего в сегмент (слева и справа)
    down = (d1 < 0).astype(int).values
    run_l = np.zeros(len(z))
    for i in range(1, len(z)):
        run_l[i] = run_l[i - 1] + 1 if down[i] else 0
    up = (d1.shift(-1).fillna(0) > 0).astype(int).values
    run_r = np.zeros(len(z))
    for i in range(len(z) - 2, -1, -1):
        run_r[i] = run_r[i + 1] + 1 if up[i] else 0
    out["catch_left"] = run_l
    out["catch_right"] = run_r
    # расстояние (в сегментах) до ближайшего локального минимума профиля (окно 11)
    lm = (zs == zs.rolling(11, center=True, min_periods=1).min()).values
    idx = np.where(lm)[0]
    pos = np.arange(len(z))
    out["dist_to_min"] = (np.abs(pos[:, None] - idx[None, :]).min(axis=1)
                          if len(idx) else np.full(len(z), 99.0))
    # глубина кармана в разных окнах (как features.pocket_depth, окно 50)
    for w in (10, 25, 100):
        lmax = z.rolling(w, min_periods=1).max()
        rmax = z[::-1].rolling(w, min_periods=1).max()[::-1]
        out[f"pocket_{w}"] = (np.minimum(lmax, rmax) - z).clip(lower=0).values
    # нормированная позиция по высоте внутри трубы (0 — самая низкая точка)
    rng = max(float(z.max() - z.min()), 1e-6)
    out["z_norm"] = ((z - z.min()) / rng).values
    out["z_rank"] = z.rank(pct=True).values
    df = pd.DataFrame(out, index=g.index)
    return df


RELIEF = (["sag_5", "sag_11", "sag_31", "sag_101", "curv", "vbottom", "catch_left",
           "catch_right", "dist_to_min", "pocket_10", "pocket_25", "pocket_100",
           "pocket_depth", "z_norm", "z_rank"])


def add_relief(df: pd.DataFrame) -> pd.DataFrame:
    """Добавить RELIEF-признаки (по id+start+end — каждая пара своя копия профиля)."""
    parts = [_per_pipe(g) for _, g in df.groupby(["id", "start", "end"], sort=False)]
    extra = pd.concat(parts)
    df = df.copy()
    for c in extra.columns:
        df[c] = extra[c]
    return df
