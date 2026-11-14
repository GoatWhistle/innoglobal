"""Лаборатория, серия 11: бэггинг по гиперпараметрам для кейса 2 (без Optuna).

Проблема: профили цели кейса 2 с Optuna и без коррелируют лишь на 0.63 —
форма зависит от выбора гиперпараметров. Гипотеза: усреднение ансамбля по
нескольким разумным наборам (глубина × темп обучения) стабилизирует форму, не
роняя r² на валидации.

Две непересекающиеся сетки A и B по 3 набора; в каждом наборе — 3 бустинга
(CatBoost — бэг по сидам train.BAG_SEEDS), AFT общий.
Метрики: r² на val_case2; корреляция профилей цели: набор vs набор, бэг A vs бэг B.
Запуск: uvx --with-requirements requirements.txt python experiments/lab11_param_bagging.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin.train import CASES, fit_bag, pearson_r2, predict_bag, survival_labels  # noqa: E402

CASE = "case2"
# (глубина, темп): A и B не пересекаются ни по одной паре
GRID_A = ((4, 0.03), (6, 0.05), (8, 0.10))
GRID_B = ((4, 0.10), (6, 0.03), (8, 0.05))


def params_of(depth: int, lr: float) -> dict:
    return {"catboost": dict(depth=depth, learning_rate=lr),
            "lgbm": dict(num_leaves=2 ** depth - 1, learning_rate=lr),
            "xgb": dict(max_depth=depth, learning_rate=lr)}


def main() -> None:
    ds = survival_labels(pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv",
                                     parse_dates=["start", "end"]))
    pr = pd.read_csv(C.PROCESSED_DIR / "predict_dataset.csv", parse_dates=["start", "end"])
    cfg = CASES[CASE]
    feats = F.case_features(ds, CASE)
    sub = ds[ds["kind"].isin(cfg["train_kinds"])]
    tr, va = sub[sub["split"] == "train"], ds[ds["split"] == cfg["val_split"]]
    tgt = pr[pr["id"] == C.CASE2_ID].sort_values("segment_id")
    y = va["y"].values

    val, prof = {}, {}
    for g in GRID_A + GRID_B:
        p = params_of(*g)
        vb = fit_bag(tr[feats], tr["y"], tr["aft_lb"].values, tr["aft_ub"].values, p, cfg["aft"])
        val[g] = predict_bag(vb, va[feats], va["wt_nom"].values)["ensemble"]
        fb = fit_bag(sub[feats], sub["y"], sub["aft_lb"].values, sub["aft_ub"].values,
                     p, cfg["aft"])
        prof[g] = predict_bag(fb, tgt[feats], tgt["wt_nom"].values)["ensemble"]
        print(f"depth {g[0]} lr {g[1]:.2f}: val r² {pearson_r2(y, val[g]):.4f}", flush=True)

    single = np.array([pearson_r2(y, val[g]) for g in GRID_A + GRID_B])
    bag_a = np.mean([val[g] for g in GRID_A], axis=0)
    bag_b = np.mean([val[g] for g in GRID_B], axis=0)
    pa = np.mean([prof[g] for g in GRID_A], axis=0)
    pb = np.mean([prof[g] for g in GRID_B], axis=0)
    pair_stab = [np.corrcoef(prof[a], prof[b])[0, 1] for a in GRID_A for b in GRID_B]

    print("\n=== итог (кейс 2) ===")
    print(f"val r² одиночный набор: {single.mean():.4f} ± {single.std():.4f} "
          f"(min {single.min():.4f}, max {single.max():.4f})")
    print(f"val r² бэг A: {pearson_r2(y, bag_a):.4f}; бэг B: {pearson_r2(y, bag_b):.4f}; "
          f"A+B: {pearson_r2(y, (bag_a + bag_b) / 2):.4f}")
    print(f"стабильность профиля цели: набор vs набор corr = {np.mean(pair_stab):.3f} "
          f"(min {np.min(pair_stab):.3f}); бэг A vs бэг B corr = {np.corrcoef(pa, pb)[0, 1]:.3f}")


if __name__ == "__main__":
    main()
