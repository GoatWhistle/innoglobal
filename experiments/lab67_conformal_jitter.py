"""Серия 67 (интеграция): покрытие конформного интервала кейса 1 при ошибке сдвига.

Полуширины (artifacts/metrics.json, conformal.case1) посчитаны по невязкам блока case1_measured
(сдвиг точный). У 22871 ошибка интерполяции сдвига ~1 м — проверяем покрытие 80%/90% на
honest-датасетах lab30 с ошибкой δ (LAB_JITTER). Прогноз = dens_quant в уровне ens_blend блока
case1_measured (artifacts/val_predictions.csv; уровень от сдвига не зависит) и разбросе 1.2·std(ens_blend)
(train.CASES case1 quant_scale, lab73),
клип [0.5, номинал] — как в predict.py.
ИТОГ (полуширины 0.315/0.408 по case1_measured): |δ|<=1 м 78-82% / 89-91%, сосед 56%/69%.
После аудита lab81 (максимум по блокам, 0.526/0.804): |δ|<=1 м 95-96% / 98%, |δ|=2 94-95%, сосед ~78%/89%.
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
    eb = vp.loc[vp["case"] == "case1_measured", "ens_blend"]
    lvl, sd = float(eb.mean()), float(T.CASES["case1"]["quant_scale"]) * float(np.std(eb))
    rows = []
    for tag in a.tags.split(","):
        ds = pd.read_csv(Path(a.root) / tag / "train_dataset.csv")
        va = ds[ds["split"] == "val_case1"]
        y = va["y"].values
        p = T.zscore(T.dens_quant_score(va)) * sd + lvl
        p = np.clip(p, 0.5, va["wt_nom"].values)
        r = dict(tag=tag, r2=T.pearson_r2(y, p), mae=float(np.mean(np.abs(y - p))))
        for k, h in conf.items():
            r[f"cov_{k}"] = float(np.mean(np.abs(y - p) <= h))
        rows.append(r)
    print("полуширины", {k: round(v, 3) for k, v in conf.items()})
    print(pd.DataFrame(rows).round(3).to_string(index=False))


if __name__ == "__main__":
    main()
