"""Лаборатория 73: масштаб dens_quant_cal (std(ens_blend) против std(prev_min)) и покрытие интервалов.

dens_quant_cal = z(dens_quant) · масштаб + mean(ens_blend); mean/std ens_blend = mean/std ансамбля
(медиана членов, база на честном train; классификатор на мм-калибровку не влияет — детерминировано).
Датасеты (lab30_merge_build.py, LAB_HONEST=1, logs/ds73/<tag>): nb — сдвиг от соседа; or — оракул
(сдвиг по своей паре); orj±δ — оракул с ошибкой сдвига δ м; self22 — сама 22871 2018 -> 2022
(525 сегм., PIPETWIN_VAL1=self22, PIPETWIN_CASE1_COMPOSE=0: композиция сдвигает только прошлый
пропуск и на этой паре разъехалась бы с таргетом).
Интервалы — симметричный сплит-конформный (как train.conformal_halfwidths):
  xfit — кросс-фит по 5 блокам внутри датасета (честное покрытие);
  prod — полуширины с оракульного блока (or, как case1_measured в train.run) на датасетах с ошибкой
         сдвига: так работает прод для 22871 (сдвиг измерен с ошибкой ~1 м).
Запуск: python experiments/lab73_dens_scale.py logs/ds73

ИТОГ (r² / r2d одинаковы для всех масштабов; MAE / RMSE; оракул — среднее по δ):
                     ens (было)      prev           ×1.2 (ПРИНЯТО)
  оракул |δ|≤1       0.233 / 0.321   0.207 / 0.290  0.215 / 0.298
  оракул все δ       0.239 / 0.328   0.214 / 0.302  0.222 / 0.307   (MAE лучше на 7/7 δ у prev и ×1.2)
  сосед (nb)         0.337 / 0.468   0.357 / 0.507  0.341 / 0.479
  self22 (525)       0.398 / 0.571   0.737 / 0.914  0.398 / 0.567
  r² / r2d: оракул 0.748 / 0.510 (δ=0), 0.713-0.735 / 0.44-0.49 (|δ|≤1), 0.640-0.669 / 0.36-0.40 (±2);
  сосед 0.289 / 0.082; self22 0.224 / 0.324.
std(prev_min) отвергнут: на self22 (прошлый пропуск — снаряд 2018, std(prev_min) 1.01 при оптимальных
0.29) MAE почти вдвое хуже. ×1.2 = min(prev, 1.2·ens) на всех датасетах; на 22871 ×1.2 -> 0.63 мм (≈ prev 0.62).
Интервалы для ×1.2: кросс-фит покрытие 80% — 0.78-0.82, 90% — 0.90-0.93 на всех датасетах (ширина
p10-p90 0.64-0.81 мм в оракуле, 1.04 сосед, 1.22 self22). Прод-правило (полуширины с оракульного блока
0.326 / 0.435 мм): |δ|≤1 — 0.80-0.82 / 0.87-0.93 (номинал), ±2 — 0.73-0.75 / 0.85-0.87; сосед 0.58 / 0.75,
self22 0.60 / 0.68 — при большой ошибке сдвига интервалы узковаты.
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from pipetwin import features as F  # noqa: E402
from pipetwin import train as T  # noqa: E402

TAGS = ("or", "orj-2", "orj-1", "orj-0.5", "orj0.5", "orj1", "orj2", "nb", "self22")


def xfit_cov(y, p, lvl, k=5):
    n = len(y)
    lo, hi = np.empty(n), np.empty(n)
    for b in np.array_split(np.arange(n), k):
        m = np.ones(n, bool)
        m[b] = False
        h = T.conformal_halfwidths(y[m] - p[m])["p10_p90" if lvl == 0.8 else "p05_p95"]
        lo[b], hi[b] = p[b] - h, p[b] + h
    hi = np.minimum(hi, 8.0)
    return float(np.mean((y >= lo) & (y <= hi))), float(np.mean(hi - lo))


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "logs/ds73")
    cfg = T.CASES["case1"]
    preds, rows = {}, []
    for tag in TAGS:
        ds = pd.read_csv(root / tag / "train_dataset.csv", parse_dates=["start", "end"])
        ds = T.survival_labels(ds[~ds["split"].isin(["train_honest", "val_case1_measured"])])
        feats = F.case_features(ds, "case1")
        sub = ds[ds["kind"].isin(cfg["train_kinds"])]
        tr, va = sub[sub["split"] == "train"], ds[ds["split"] == cfg["val_split"]]
        bag = T.fit_bag(tr[feats], tr["y"], tr["aft_lb"].values, tr["aft_ub"].values,
                        cfg["params"], cfg["aft"], families=cfg["families"])
        ens = T.predict_bag(bag, va[feats], va["wt_nom"].values,
                            agg=cfg.get("member_agg", "mean"))["ensemble"]
        y, hd, wt = va["y"].values, va["had_defect"].values.astype(bool), va["wt_nom"].values
        z = T.zscore(T.dens_quant_score(va))
        r = float(np.corrcoef(y, z)[0, 1])
        se, sp = float(np.std(ens)), float(np.std(va["prev_min"].values))
        for sc_name, sc in (("ens", se), ("prev", sp), ("x1.2", 1.2 * se),
                            ("min(prev,1.2ens)", min(sp, 1.2 * se))):
            p = np.clip(z * sc + np.mean(ens), 0.5, wt)
            preds[(tag, sc_name)] = (y, p)
            c80, w80 = xfit_cov(y, p, 0.8)
            c90, w90 = xfit_cov(y, p, 0.9)
            rows.append(dict(tag=tag, scale=sc_name, n=len(y), r2=T.pearson_r2(y, p),
                             r2d=T.pearson_r2(y[hd], p[hd]), mae=float(np.mean(np.abs(y - p))),
                             rmse=float(np.sqrt(np.mean((y - p) ** 2))),
                             mape=float(np.mean(np.abs(y - p) / y) * 100),
                             bias=float(np.mean(p - y)), cov80_xfit=c80, w80=w80,
                             cov90_xfit=c90, w90=w90, r_opt_scale=r * float(np.std(y)),
                             scale_val=float(sc)))
        print(tag, "готово", flush=True)
    df = pd.DataFrame(rows)
    # прод-правило: полуширины с оракульного блока -> датасеты с ошибкой сдвига
    for i, rw in df.iterrows():
        yo, po = preds[("or", rw.scale)]
        h = T.conformal_halfwidths(yo - po)
        y, p = preds[(rw.tag, rw.scale)]
        for key, col in (("p10_p90", "cov80_prod"), ("p05_p95", "cov90_prod")):
            df.loc[i, col] = float(np.mean((y >= p - h[key]) & (y <= np.minimum(p + h[key], 8.0))))
        df.loc[i, "h80_prod"], df.loc[i, "h90_prod"] = h["p10_p90"], h["p05_p95"]
    pd.set_option("display.width", 250)
    print(df.round(4).to_string(index=False))
    orc = df[df.tag.str.startswith("or")]
    for k in ("r2", "r2d", "mae", "rmse"):
        piv = orc.pivot_table(index="scale", columns="tag", values=k)
        near = [t for t in piv.columns if t in ("or", "orj-1", "orj-0.5", "orj0.5", "orj1")]
        print(f"{k}: |δ|≤1 среднее", piv[near].mean(axis=1).round(4).to_dict(),
              "все δ", piv.mean(axis=1).round(4).to_dict())


if __name__ == "__main__":
    main()
