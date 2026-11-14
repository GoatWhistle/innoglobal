"""Серия 67 (интеграция): покрытие конформного интервала кейса 1 при ошибке сдвига.

Полуширины (artifacts/metrics.json, conformal.case1) посчитаны по невязкам блока case1_measured
(сдвиг точный). У 22871 ошибка интерполяции сдвига ~1 м — проверяем покрытие 80%/90% на
honest-датасетах lab30 с ошибкой δ (LAB_JITTER). Прогноз = dens_quant в уровне ens_blend блока
case1_measured (artifacts/val_predictions.csv; уровень от сдвига не зависит) и разбросе std(prev_min),
клип [0.5, номинал] — как в predict.py.
Запуск: python experiments/lab67_conformal_jitter.py <ds_root> --tags d_m60_or,d_jit-1,...
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from pipetwin import train as T  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root")
    ap.add_argument("--tags", required=True)
    a = ap.parse_args()
    conf = json.loads((ROOT / "artifacts/metrics.json").read_text())["conformal"]["case1"]
    vp = pd.read_csv(ROOT / "artifacts/val_predictions.csv")
    lvl = float(vp.loc[vp["case"] == "case1_measured", "ens_blend"].mean())
    rows = []
    for tag in a.tags.split(","):
        ds = pd.read_csv(Path(a.root) / tag / "train_dataset.csv")
        va = ds[ds["split"] == "val_case1"]
        y = va["y"].values
        p = T.zscore(T.dens_quant_score(va)) * float(np.std(va["prev_min"])) + lvl
        p = np.clip(p, 0.5, va["wt_nom"].values)
        r = dict(tag=tag, r2=T.pearson_r2(y, p), mae=float(np.mean(np.abs(y - p))))
        for k, h in conf.items():
            r[f"cov_{k}"] = float(np.mean(np.abs(y - p) <= h))
        rows.append(r)
    print("полуширины", {k: round(v, 3) for k, v in conf.items()})
    print(pd.DataFrame(rows).round(3).to_string(index=False))


if __name__ == "__main__":
    main()
