"""Лаборатория 43: интервалы p10-p90 кейса 1 — покрытие и конформная калибровка.

Квантильный конверт — CatBoost alpha 0.1/0.9 (как в train.run), обучен на train,
проверка на валидации 2022->2023 (55 сегментов). Сравниваются:
  raw      — [p10, p90] CatBoost как есть + монотонность вокруг прогноза (как predict.py);
  cqr_xfit — конформная квантильная регрессия (CQR): поправка ширины по
             невязкам, кросс-фит по 5 позиционным блокам валидации (точка не видит
             своей метки; в проде калибровочный набор — те же 55 пар соседей 2023);
  abs_xfit — симметричный конформный интервал прогноз ± q80(|невязки|), тот же кросс-фит.
  asym_xfit — асимметричный: хвосты по 10% отдельно для (y - прогноз) и (прогноз - y).
Цель — покрытие 80% при минимальной ширине.

ИТОГ (сиды 42/7/2024, прогноз = калиброванный бленд + клип по номиналу):
  raw CatBoost p10-p90: покрытие 12.7% при ширине 0.13 мм (!); с монотонностью
      вокруг прогноза (как predict.py) — 30.9% / 0.33 мм;
  cqr_xfit 80.0% / 0.97 мм; abs_xfit 83.0% / 0.86 мм; asym_xfit 86.1% / 1.01 мм.
ПРИНЯТО: abs (симметричный сплит-конформный) — лучшая пара покрытие/ширина.
В прод: train.conformal_halfwidths по невязкам валидации (полуширина 0.409 мм
для p10-p90, 0.607 для p05-p95), predict.py строит интервал кейса 1 вокруг
прогноза; кейс 2 — прежний CatBoost-конверт.
"""
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import train as T  # noqa: E402

CACHE = joblib.load(Path(__file__).resolve().parent / "data" / "lab40_cache.joblib")
K = 5


def cq(scores, level=0.8):
    n = len(scores)
    q = min(1.0, np.ceil((n + 1) * level) / n)
    return float(np.quantile(scores, q, method="higher"))


def main():
    ds = pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv", parse_dates=["start", "end"])
    cfg = T.CASES["case1"]
    feats = F.case_features(ds, "case1")
    sub = ds[ds["kind"].isin(cfg["train_kinds"])]
    tr, va = sub[sub["split"] == "train"], ds[ds["split"] == cfg["val_split"]]
    q = {}
    for a in (0.1, 0.9):
        m = T.make_model("catboost", {}, alpha=a).fit(tr[feats], tr["y"])
        q[a] = m.predict(va[feats])
    c = CACHE["val"]
    y, ens, pm = va["y"].values, c["ensemble"], va["prev_min"].values
    rows = []
    for seed in (42, 7, 2024):
        b = T.blend_prob(ens, c[f"p_{seed}"], 2.0, gap=ens - c["q05"], gap_w=0.5)
        pred = np.clip(T.calibrate_mm(b, ens, pm), 0.5, 8.0)
        lo, hi = np.minimum(q[0.1], pred), np.maximum(q[0.9], pred)
        res = {"raw": (lo, hi)}
        n = len(y)
        lo_c, hi_c, lo_a, hi_a, lo_s, hi_s = (np.empty(n) for _ in range(6))
        for blk in np.array_split(np.arange(n), K):
            msk = np.ones(n, bool)
            msk[blk] = False
            s = np.maximum(lo[msk] - y[msk], y[msk] - hi[msk])
            e = cq(s)
            lo_c[blk], hi_c[blk] = lo[blk] - e, hi[blk] + e
            r = cq(np.abs(y[msk] - pred[msk]))
            lo_a[blk], hi_a[blk] = pred[blk] - r, pred[blk] + r
            d = y[msk] - pred[msk]
            lo_s[blk] = pred[blk] - cq(-d, 0.9)
            hi_s[blk] = pred[blk] + cq(d, 0.9)
        res["cqr_xfit"] = (np.minimum(lo_c, pred), np.maximum(hi_c, pred))
        res["abs_xfit"] = (lo_a, hi_a)
        res["asym_xfit"] = (np.minimum(lo_s, pred), np.maximum(hi_s, pred))
        for name, (l, h) in res.items():
            h = np.minimum(h, 8.0)
            rows.append(dict(seed=seed, method=name,
                             coverage=float(np.mean((y >= l) & (y <= h))),
                             width=float(np.mean(h - l)),
                             below=float(np.mean(y < l)), above=float(np.mean(y > h))))
    df = pd.DataFrame(rows)
    print(df.groupby("method").mean(numeric_only=True).round(3).to_string())
    print("raw p10/p90 сами по себе: покрытие",
          round(float(np.mean((y >= q[0.1]) & (y <= q[0.9]))), 3),
          "ширина", round(float(np.mean(q[0.9] - q[0.1])), 3))


if __name__ == "__main__":
    main()
