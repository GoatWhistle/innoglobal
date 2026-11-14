"""Лаборатория, серия 38 (кейс 2): комбинации бустингов LGBM/XGB/CatBoost/AFT.

Каждое семейство — усреднение по сетке PARAM_GRID (как референс LGBM), таргет
толщина, квантиль 0.5 (AFT — потеря металла с интервальной цензурой, как в
кейсе 1, sigma 2/3). CatBoost зависит от сида — сиды 42/7/2024, остальные
детерминированы. Комбинации: все непустые подмножества, усреднение в мм и в
z-шкале (z-усреднение с возвратом к уровню/разбросу LGBM). Плюс LGBM на
квантилях alpha 0.3/0.4/0.6.
Прогнозы кэшируются в logs/lab38_cache_<TAG>.npz (stage=fit), комбинации — stage=combo.

ИТОГ (r², V1 — среднее/минимум по сидам CatBoost 42/7/2024):
  lgbm (референс)        V1 0.1813  V2 0.0098  V3 0.0075  MAE V1 0.861
  lgbm+xgb mm            V1 0.1555  V2 0.0044  V3 0.0068
  lgbm+cb mm             V1 0.1272 (min 0.119)
  lgbm+aft2 mm           V1 0.1203  (лучший MAE 0.858)
  lgbm+xgb+cb+aft2 mm    V1 0.1025
  xgb / aft2 / cb одиночно  0.083 / 0.053 / 0.032
  z-усреднение хуже мм-усреднения почти везде.
  LGBM квантиль 0.3/0.4/0.6: V1 0.135/0.151/0.156 — медиана лучшая.
Отвергнуто: все 40 комбинаций (5 семейств × мм/z) хуже одиночного LGBM на V1 на
всех сидах; на V2/V3 различия — шум 0.00-0.02 (xgb+aft3 z даёт V2 0.021, но V1 0.07).
Подтверждает lab15/lab16 на актуальных выровненных данных.
"""
import itertools
import os
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost
from catboost import CatBoostRegressor
from lightgbm import LGBMRegressor
from xgboost import XGBRegressor

sys.path.insert(0, str(Path(__file__).resolve().parent))
import c2lab as L  # noqa: E402

GRID = ((4, 0.03), (6, 0.05), (8, 0.10), (4, 0.10), (6, 0.03), (8, 0.05))
NJ = int(os.environ.get("NJ", "8"))
LOGS = Path(__file__).resolve().parents[1] / "logs"
CACHE = LOGS / f"lab38_cache_{os.environ.get('TAG', 'a')}.npz"


def fam_predict(fam, tr, va, feats, seed=42):
    X, Xv, y = tr[feats], va[feats], tr["y"]
    ps = []
    for d, lr in GRID:
        if fam.startswith("lgbm"):
            a = float(fam[4:] or 0.5)
            m = LGBMRegressor(objective="quantile", alpha=a, n_estimators=600,
                              learning_rate=lr, num_leaves=2 ** d - 1, random_state=42,
                              verbosity=-1, n_jobs=NJ)
        elif fam == "xgb":
            m = XGBRegressor(objective="reg:quantileerror", quantile_alpha=0.5,
                             n_estimators=600, learning_rate=lr, max_depth=d,
                             random_state=42, verbosity=0, n_jobs=NJ)
        elif fam == "cb":
            m = CatBoostRegressor(loss_function="Quantile:alpha=0.5", iterations=600,
                                  learning_rate=lr, depth=d, random_seed=seed,
                                  verbose=0, thread_count=NJ)
        elif fam.startswith("aft"):
            sigma = float(fam[3:])
            dtr = xgboost.DMatrix(X)
            dtr.set_float_info("label_lower_bound", tr["aft_lb"].values)
            dtr.set_float_info("label_upper_bound", tr["aft_ub"].values)
            b = xgboost.train(dict(objective="survival:aft", aft_loss_distribution="normal",
                                   aft_loss_distribution_scale=sigma, tree_method="hist",
                                   learning_rate=lr, max_depth=d, seed=42, nthread=NJ),
                              dtr, num_boost_round=600)
            ps.append(va["wt_nom"].values - b.predict(xgboost.DMatrix(Xv)))
            continue
        ps.append(m.fit(X, y).predict(Xv))
    return np.mean(ps, axis=0)


FAMS = ["lgbm", "xgb", "cb@42", "cb@7", "cb@2024", "aft2", "aft3",
        "lgbm0.3", "lgbm0.4", "lgbm0.6"]


def stage_fit(only):
    ds, sub, feats = L.load()
    cache = dict(np.load(CACHE)) if CACHE.exists() else {}
    for name, pairs in L.splits(ds, sub).items():
        for i, (tr, va) in enumerate(pairs):
            key0 = f"{name}|{i}"
            cache[f"{key0}|y"] = va["y"].values
            for fam in FAMS:
                if only and fam not in only:
                    continue
                key = f"{key0}|{fam}"
                if key in cache:
                    continue
                t = time.time()
                f, _, s = fam.partition("@")
                cache[key] = fam_predict(f, tr, va, feats, int(s or 42))
                print(key, f"{time.time() - t:.0f}s r2={L.r2(va['y'], cache[key]):.4f}",
                      flush=True)
                np.savez(CACHE, **cache)


def zavg(ps, ref):
    z = np.mean([(p - p.mean()) / (p.std() + 1e-12) for p in ps], axis=0)
    z = z / (z.std() + 1e-12)
    return z * ref.std() + ref.mean()


def stage_combo():
    c = {}
    for f in sorted(LOGS.glob("lab38_cache_*.npz")):
        c.update(dict(np.load(f)))
    keys = sorted({k.rsplit("|", 1)[0] for k in c})
    base = ["lgbm", "xgb", "cb", "aft2", "aft3"]
    rows = []
    for seed in (42, 7, 2024):
        for k in range(1, len(base) + 1):
            for combo in itertools.combinations(base, k):
                if "aft2" in combo and "aft3" in combo:
                    continue
                for how in ("mm", "z"):
                    if how == "z" and len(combo) == 1:
                        continue
                    res = {}
                    for key in keys:
                        y = c[f"{key}|y"]
                        ps = [c[f"{key}|{f}@{seed}" if f == "cb" else f"{key}|{f}"]
                              for f in combo]
                        p = np.mean(ps, axis=0) if how == "mm" else zavg(ps, c[f"{key}|lgbm"])
                        sp = key.split("|")[0]
                        res.setdefault(sp, []).append((L.r2(y, p), L.mae(y, p)))
                    row = dict(combo="+".join(combo), how=how, seed=seed)
                    for sp, v in res.items():
                        row[f"{sp}_r2"] = np.mean([a for a, _ in v])
                        row[f"{sp}_mae"] = np.mean([b for _, b in v])
                    rows.append(row)
    df = pd.DataFrame(rows)
    agg = df.groupby(["combo", "how"]).agg(
        V1=("V1_r2", "mean"), V1min=("V1_r2", "min"), V1mae=("V1_mae", "mean"),
        V2=("V2_r2", "mean"), V3=("V3_r2", "mean")).round(4)
    print(agg.sort_values("V1", ascending=False).to_string())
    for f in ("lgbm0.3", "lgbm0.4", "lgbm0.6"):
        r = {sp: np.mean([L.r2(c[f"{k}|y"], c[f"{k}|{f}"]) for k in keys if k.startswith(sp)])
             for sp in ("V1", "V2", "V3")}
        print(f, {k: round(v, 4) for k, v in r.items()})


if __name__ == "__main__":
    if sys.argv[1] == "fit":
        stage_fit(sys.argv[2:])
    else:
        stage_combo()
