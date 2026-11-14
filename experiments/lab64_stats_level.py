"""Лаборатория 64: уровень/масштаб, интервалы и кривая для дефолта кейса 1 aligned_stats_cal.

aligned_stats_cal = z(aligned_stats) · std(ens_blend) + mean(ens_blend); у бленда среднее и разброс
те же, что у ансамбля, поэтому классификатор на мм-калибровку не влияет — замер детерминирован
(сиды не нужны). Робастность — по четырём честным датасетам (lab30, LAB_HONEST=1):
nb — сдвиг прошлого пропуска от соседа (дефолт валидации), or — оракул (сдвиг по самой паре,
ближе к геометрии 22871), orm1/orp1 — оракул с ошибкой сдвига −1/+1 м.
Варианты уровня/масштаба; оценка r², r2d (только дефектные), MAE/RMSE/MAPE, смещение;
интервалы — симметричный сплит-конформный, кросс-фит по 5 блокам (как lab43).
Запуск: python experiments/lab64_stats_level.py logs/ds64 --tags nb,or,orm1,orp1
(датасеты: LAB_HONEST=1 [PIPETWIN_ALIGN_ORACLE=1] [LAB_JITTER=±1] python experiments/lab30_merge_build.py logs/ds64/<tag>)

ИТОГ (r² / r2d / MAE / RMSE / MAPE / смещение, дефолт cal[median]):
  nb   0.273 / 0.043 / 0.339 / 0.474 / 5.76 / +0.035
  or   0.701 / 0.407 / 0.233 / 0.329 / 4.02 / +0.020
  orm1 0.658 / 0.329 / 0.244 / 0.343 / 4.20 / +0.018
  orp1 0.694 / 0.399 / 0.237 / 0.333 / 4.08 / +0.027
- Уровень коллеги (среднее/разброс ens_blend) несмещён: +0.02..0.05 мм. Медиана членов (lab63) против
  среднего: смещение 0.049-0.061 -> 0.018-0.035, RMSE лучше 4/4, MAE ±0.003 — оставлено.
- Уровень от прошлого пропуска (сырой aligned_stats): смещение +0.34..0.36, MAE 0.36-0.47 — уровень
  prev для мм не годится (снаряд 2023 глубже), калибровка к ансамблю верна.
- level=median(ens), level=mean(prev)−0.35: в пределах ±0.003 — не нужно.
- Масштаб: MSE-оптимальный разброс r·σy = 0.29 (nb, r 0.52) против 0.45-0.46 (оракул, r 0.81-0.84) при
  std(ens) 0.33. ×1.2 / std(prev_min) в оракуле MAE −0.006..−0.010, RMSE −0.02, но в nb +0.006 / +0.021;
  знак зависит от режима сдвига (а прирост < 0.01) — НЕ принято, дефолт std(ens) — компромисс между
  режимами. Если сдвиг 22871 считать оракульным (±1 м) — ×1.2 даст ~−0.008 MAE.
- Интервалы (кросс-фит abs 80%): покрытие 0.78-0.84 во всех режимах; ширина 1.01 (nb), 0.75-0.77 (оракул).
  Прод-полуширина берётся из невязок дефолтной валидации (nb): 0.512 (p10-p90), 0.772 (p05-p95) —
  для оракульной геометрии 22871 консервативно.
"""
import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from pipetwin import features as F  # noqa: E402
from pipetwin import train as T  # noqa: E402


def cq(a, lvl):
    a = np.sort(a)
    n = len(a)
    return float(a[min(n - 1, int(np.ceil((n + 1) * lvl)) - 1)])


def conformal_xfit(y, pred, lvl=0.8, k=5):
    n = len(y)
    lo, hi = np.empty(n), np.empty(n)
    for b in np.array_split(np.arange(n), k):
        m = np.ones(n, bool)
        m[b] = False
        h = cq(np.abs(y[m] - pred[m]), lvl)
        lo[b], hi[b] = pred[b] - h, pred[b] + h
    hi = np.minimum(hi, 8.0)
    return float(np.mean((y >= lo) & (y <= hi))), float(np.mean(hi - lo))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root")
    ap.add_argument("--tags", required=True)
    a = ap.parse_args()
    cfg = T.CASES["case1"]
    rows = []
    for tag in a.tags.split(","):
        ds = pd.read_csv(Path(a.root) / tag / "train_dataset.csv", parse_dates=["start", "end"])
        ds = T.survival_labels(ds[ds["split"] != "train_honest"])
        feats = F.case_features(ds, "case1")
        sub = ds[ds["kind"].isin(cfg["train_kinds"])]
        tr, va = sub[sub["split"] == "train"], ds[ds["split"] == cfg["val_split"]]
        y, hd, wt = va["y"].values, va["had_defect"].values.astype(bool), va["wt_nom"].values
        pm = va["prev_min"].values
        bag = T.fit_bag(tr[feats], tr["y"], tr["aft_lb"].values, tr["aft_ub"].values,
                        cfg["params"], cfg["aft"], families=cfg["families"])
        ens = {g: T.predict_bag(bag, va[feats], wt, agg=g)["ensemble"] for g in ("mean", "median")}
        z = T.zscore(T.aligned_stats_score(va))
        r = np.corrcoef(y, z)[0, 1]
        V = {}
        for g, e in ens.items():
            mu, sd = float(np.mean(e)), float(np.std(e))
            V[f"cal[{g}] (дефолт)" if g == cfg.get("member_agg", "mean") else f"cal[{g}]"] = z * sd + mu
        e = ens[cfg.get("member_agg", "mean")]
        mu, sd, med = float(np.mean(e)), float(np.std(e)), float(np.median(e))
        V["level=median(ens)"] = z * sd + med
        for s in (0.6, 0.8, 1.2, 1.4):
            V[f"scale×{s}"] = z * sd * s + mu
        V["scale=std(prev_min)"] = z * np.std(pm) + mu
        V["aligned_stats (уровень prev)"] = T.aligned_stats_score(va)
        V["level=mean(prev)-0.35"] = z * sd + np.mean(pm) - 0.35
        for name, p in V.items():
            p = np.clip(p, 0.5, wt)
            cov, wid = conformal_xfit(y, p)
            rows.append(dict(tag=tag, variant=name, r2=T.pearson_r2(y, p),
                             r2d=T.pearson_r2(y[hd], p[hd]),
                             mae=float(np.mean(np.abs(y - p))),
                             rmse=float(np.sqrt(np.mean((y - p) ** 2))),
                             mape=float(np.mean(np.abs(y - p) / y) * 100),
                             bias=float(np.mean(p - y)), cov80=cov, width80=wid))
        print(f"{tag}: r(stats) {r:.3f}, std(y) {y.std():.3f}, оптимальный разброс r·σy "
              f"{r * y.std():.3f}, std(ens) mean/median {np.std(ens['mean']):.3f}/"
              f"{np.std(ens['median']):.3f}, std(prev) {np.std(pm):.3f}", flush=True)
    df = pd.DataFrame(rows)
    print(df.round(4).to_string(index=False))
    piv = df.pivot_table(index="variant", columns="tag", values="mae").round(4)
    piv["mean"] = piv.mean(axis=1).round(4)
    print("\nMAE по датасетам:\n", piv.sort_values("mean").to_string())


if __name__ == "__main__":
    main()
