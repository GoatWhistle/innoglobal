"""Лаборатория, серия 10: стабильность профиля кейса 2 и бэггинг по сидам.

Проблема: прогноз целевой трубы кейса 2 (1250009583) с тюнингом и без коррелирует
лишь на 0.63 — при r² ≈ 0.1 форма профиля неустойчива. Гипотеза: усреднение
боевого ансамбля (3 бустинга + AFT) по нескольким сидам снижает дисперсию формы,
не роняя r² на валидации.

Метрики:
  - r² на val_case2: одиночный сид vs бэг из K сидов;
  - стабильность: корреляция профилей целевой трубы двух независимых наборов
    (сид vs сид; бэг из K сидов vs другой бэг из K сидов).
Гиперпараметры — боевые (artifacts/metrics.json).
Запуск: uvx --with-requirements requirements.txt python experiments/lab10_seed_bagging.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin.train import (CASES, MODEL_FAMILIES, fit_aft, make_model,  # noqa: E402
                            pearson_r2, survival_labels)

CASE = "case2"
SEEDS_A = (1, 2, 3, 4, 5)
SEEDS_B = (6, 7, 8, 9, 10)


def ensemble(tr, X, feats, params, seed, cfg) -> np.ndarray:
    C.SEED = seed
    preds = [make_model(f, dict(params[f])).fit(tr[feats], tr["y"]).predict(X[feats])
             for f in MODEL_FAMILIES]
    aft = fit_aft(tr[feats], tr["aft_lb"].values, tr["aft_ub"].values, **cfg["aft"])
    preds.append(X["wt_nom"].values - aft.predict(xgboost.DMatrix(X[feats])))
    return np.mean(preds, axis=0)


def main() -> None:
    ds = survival_labels(pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv",
                                     parse_dates=["start", "end"]))
    pr = pd.read_csv(C.PROCESSED_DIR / "predict_dataset.csv", parse_dates=["start", "end"])
    params = json.loads((C.ARTIFACTS_DIR / "metrics.json").read_text())["params"][CASE]
    cfg = CASES[CASE]
    feats = F.case_features(ds, CASE)
    sub = ds[ds["kind"].isin(cfg["train_kinds"])]
    tr, va = sub[sub["split"] == "train"], ds[ds["split"] == cfg["val_split"]]
    tgt = pr[pr["id"] == C.CASE2_ID].sort_values("segment_id")
    y = va["y"].values

    val, prof = {}, {}
    for s in SEEDS_A + SEEDS_B:
        val[s] = ensemble(tr, va, feats, params, s, cfg)
        prof[s] = ensemble(sub, tgt, feats, params, s, cfg)  # финал: train + val
        print(f"seed {s:2d}: val r² {pearson_r2(y, val[s]):.4f}", flush=True)

    single = np.array([pearson_r2(y, val[s]) for s in SEEDS_A + SEEDS_B])
    bag_a = np.mean([val[s] for s in SEEDS_A], axis=0)
    bag_b = np.mean([val[s] for s in SEEDS_B], axis=0)
    pa = np.mean([prof[s] for s in SEEDS_A], axis=0)
    pb = np.mean([prof[s] for s in SEEDS_B], axis=0)
    pairs = [(SEEDS_A[i], SEEDS_B[i]) for i in range(len(SEEDS_A))]
    seed_stab = [np.corrcoef(prof[a], prof[b])[0, 1] for a, b in pairs]

    print("\n=== итог (кейс 2) ===")
    print(f"val r² одиночный сид: {single.mean():.4f} ± {single.std():.4f} "
          f"(min {single.min():.4f}, max {single.max():.4f})")
    print(f"val r² бэг A (5 сидов): {pearson_r2(y, bag_a):.4f}; бэг B: {pearson_r2(y, bag_b):.4f}")
    print(f"стабильность профиля цели: сид vs сид corr = {np.mean(seed_stab):.3f} "
          f"(min {np.min(seed_stab):.3f}); бэг A vs бэг B corr = {np.corrcoef(pa, pb)[0, 1]:.3f}")
    C.SEED = 42


if __name__ == "__main__":
    main()
