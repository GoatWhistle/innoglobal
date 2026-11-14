"""Диагностика уровня/масштаба бленда кейса 1 (на кэше lab40_cache)."""
import sys
from pathlib import Path

import joblib
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from pipetwin import train as T  # noqa: E402

import os
cache = joblib.load(os.environ.get("LAB40_CACHE", Path(__file__).resolve().parent / "data" / "lab40_cache.joblib"))
for part, c in cache.items():
    m = c["meta"]
    y = m["y"].values
    ens = c["ensemble"]
    print(f"== {part} n={len(y)} y mean {y.mean():.3f} med {np.median(y):.3f} std {y.std():.3f}"
          f" | ens mean {ens.mean():.3f} std {ens.std():.3f} | prev_min mean {m.prev_min.mean():.3f}"
          f" std {m.prev_min.std():.3f}")
    for k in ("lgbm", "xgb", "aft", "q05"):
        print(f"   {k}: mean {c[k].mean():.3f} std {c[k].std():.3f} r2 {T.pearson_r2(y, c[k]):.3f}")
    for key in [k for k in c if k.startswith("p_")]:
        b = T.blend_prob(ens, c[key], 2.0, gap=ens - c["q05"], gap_w=0.5)
        r = np.corrcoef(y, b)[0, 1]
        mae = np.abs(y - b).mean()
        # оракульные справки (НЕ для отбора): МНК-аффинная и оптимальный сдвиг
        bz = T.zscore(b)
        beta = r * y.std()
        print(f"   {key}: r2 {r*r:.4f} MAE {mae:.3f} RMSE {np.sqrt(((y-b)**2).mean()):.3f}"
              f" max {b.max():.2f} | oracle beta {beta:.3f} vs std(ens) {ens.std():.3f};"
              f" oracle-OLS MAE {np.abs(y - y.mean() - beta*bz).mean():.3f};"
              f" median-shift MAE {np.abs(y - b - np.median(y-b)).mean():.3f}")
