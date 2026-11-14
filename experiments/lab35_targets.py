"""Лаборатория, серия 35 (кейс 2): таргеты и лоссы LGBM-сетки.

Таргет: толщина (abs, референс) / потеря металла loss = wt_nom − y / скорость
коррозии rate = loss / возраст (мм/год) / log(loss + 0.05). Лоссы: квантиль 0.5
(референс), L2, Huber, Tweedie (на неотрицательной потере). Обратно в мм:
y = wt_nom − loss (rate · age_end).
Три валидации (experiments/c2lab.py): V1 официальная, V2 строгая, V3 ЦППН-LOPO.

ИТОГ (LGBM детерминирован — сид не влияет; V3 = среднее 4 труб ЦППН):
  вариант         V1 r2/MAE      V2 r2/MAE      V3 r2/MAE
  abs/q50 (реф)   0.1813/0.861   0.0098/0.936   0.0075/0.062
  loss/q50        0.1050/0.856   0.0210/0.995   0.0036/0.069
  rate/q50        0.0965/0.841   0.0107/0.894   0.0003/0.038
  logloss/q50     0.0595/0.878   0.0150/1.159   0.0034/0.039
  abs/l2          0.0083/0.935   0.0224/0.954   0.0024/0.114
Отвергнуто: любой другой таргет/лосс роняет V1 вдвое и больше; на V2/V3 всё —
шум около нуля (0.00-0.02). Квантильная медиана на абсолютной толщине — единственное,
что держит V1 (L2 — 0.008: бимодальный таргет, 37% сегментов на номинале).
Huber/Tweedie/rate-L2 не досчитаны (сняты ради lab36/37 — те же V1-провалы у L2-семейства).
"""
import sys
import time
from pathlib import Path

import numpy as np
from lightgbm import LGBMRegressor

sys.path.insert(0, str(Path(__file__).resolve().parent))
import c2lab as L  # noqa: E402

GRID = ((4, 0.03), (6, 0.05), (8, 0.10), (4, 0.10), (6, 0.03), (8, 0.05))
THREADS = int(__import__("os").environ.get("NJ", "8"))


def to_t(df, kind):
    loss = df["wt_nom"] - df["y"]
    if kind == "abs":
        return df["y"]
    if kind == "loss":
        return loss
    if kind == "rate":
        return loss / df["age_end"]
    if kind == "logloss":
        return np.log(loss.clip(lower=0) + 0.05)
    raise ValueError(kind)


def from_t(p, df, kind):
    nom, age = df["wt_nom"].values, df["age_end"].values
    if kind == "abs":
        return p
    if kind == "loss":
        return nom - p
    if kind == "rate":
        return nom - p * age
    if kind == "logloss":
        return nom - (np.exp(p) - 0.05)
    raise ValueError(kind)


def make(obj, d, lr):
    kw = dict(n_estimators=600, learning_rate=lr, num_leaves=2 ** d - 1,
              random_state=42, verbosity=-1, n_jobs=THREADS)
    if obj == "q50":
        kw.update(objective="quantile", alpha=0.5)
    elif obj == "l2":
        kw.update(objective="regression")
    elif obj == "huber":
        kw.update(objective="huber", alpha=0.5)
    elif obj == "l1":
        kw.update(objective="regression_l1")
    elif obj == "tweedie":
        kw.update(objective="tweedie", tweedie_variance_power=1.3)
    return LGBMRegressor(**kw)


def predictor(kind, obj):
    def fn(tr, va, feats):
        yt = to_t(tr, kind)
        if obj == "tweedie":
            yt = yt.clip(lower=0)
        ps = [make(obj, d, lr).fit(tr[feats], yt).predict(va[feats]) for d, lr in GRID]
        return from_t(np.mean(ps, axis=0), va, kind)
    return fn


VARIANTS = [("abs", "q50"), ("loss", "q50"), ("rate", "q50"), ("logloss", "q50"),
            ("abs", "l2"), ("abs", "huber"), ("loss", "tweedie"), ("rate", "l2"),
            ("rate", "huber"), ("loss", "l2")]


def main():
    ds, sub, feats = L.load()
    only = sys.argv[1:]
    for kind, obj in VARIANTS:
        name = f"{kind}/{obj}"
        if only and name not in only:
            continue
        t = time.time()
        print(name, flush=True)
        res = L.evaluate(predictor(kind, obj), ds, sub, feats)
        print(f"RES {name} " + " ".join(f"{k}={v:.4f}" for k, v in res.items()
                                         if not isinstance(v, list))
              + f" ({time.time() - t:.0f}s)", flush=True)


if __name__ == "__main__":
    main()
