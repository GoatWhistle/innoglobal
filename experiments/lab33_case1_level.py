"""Лаборатория, серия 33: уровень прогноза кейса 1 — аффинный сдвиг p99 к номиналу против клиппинга.

predict.py опускает весь профиль, если p99 прогноза выше номинала (правило для кейса 2: модель
экстраполирует на более тонкую трубу). У кейса 1 ens_blend/ens_blend+stats растягивают z-форму
на std ансамбля, и чистые сегменты (P≈0) вылетают за номинал: на 22871 сырой уровень 6.00 мм
(prev_min 2022 медиана 6.40, на валидации y ≈ prev_min − 0.35 → ожидание ~6.0), а сдвиг p99
опускает весь профиль на 0.49 мм (ens_blend — на 0.87). Пирсону всё равно, MAE — нет.
Замер на валидации (сид 42, stats_in_base + ens_blend+stats w=1): raw / shift / clip.
ИТОГ: на валидации прогноз за номинал не вылетает, все три режима совпадают; смещение уровня
+0.02..0.03 мм (m60, m60_or, δ=±1) — сырой уровень несмещён. ПРИНЯТО: кейс 1 — клиппинг без
сдвига (predict.py). 22871: средний прогноз 5.51 -> 5.99 мм, корреляция профилей 0.995,
у номинала 12 сегментов из 525 (2.3%). r² не меняется (аффинный сдвиг), MAE — ожидаемо −0.5 мм.
Запуск: python experiments/lab33_case1_level.py <ds_root> --tags m60,m60_or,m60jit-1,m60jit1
"""
import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import train as T  # noqa: E402


def level(pred, wt, mode):
    if mode == "shift":
        pred = pred - max(0.0, float(np.quantile(pred, 0.99)) - float(wt[0]))
    return np.clip(pred, 0.5, wt) if mode != "raw" else pred


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root")
    ap.add_argument("--tags", required=True)
    a = ap.parse_args()
    cfg = T.CASES["case1"]
    rows = []
    for tag in a.tags.split(","):
        ds = T.survival_labels(pd.read_csv(Path(a.root) / tag / "train_dataset.csv",
                                           parse_dates=["start", "end"]))
        feats = F.case_features(ds, "case1")
        cf = [f for f in feats if f not in F.STAT_FEATS]
        sub = ds[ds["kind"].isin(cfg["train_kinds"])]
        tr, va = sub[sub["split"] == "train"], ds[ds["split"] == cfg["val_split"]]
        bag = T.fit_bag(tr[feats], tr["y"], tr["aft_lb"].values, tr["aft_ub"].values,
                        cfg["params"], cfg["aft"], families=cfg["families"])
        ens = T.predict_bag(bag, va[feats], va["wt_nom"].values)["ensemble"]
        q05 = np.mean([m.predict(va[feats]) for m in T.fit_q05_pair(tr[feats], tr["y"], cfg["params"])], axis=0)
        p = T.fit_clf(tr[cf], tr["had_defect"]).predict_proba(va[cf])[:, 1]
        eb = T.blend_prob(ens, p, cfg["blend_w"], gap=ens - q05, gap_w=cfg["gap_w"])
        es = T.blend_stats(eb, T.aligned_stats_score(va))
        y, dm = va["y"].values, va["had_defect"].values.astype(bool)
        for name, pr in (("ens_blend", eb), ("ens_blend+stats", es)):
            for mode in ("raw", "shift", "clip"):
                out = np.empty_like(pr)
                for pid in va["id"].unique():  # по трубе, как в predict.py
                    i = (va["id"] == pid).values
                    out[i] = level(pr[i], va["wt_nom"].values[i], mode)
                rows.append(dict(tag=tag, pred=name, mode=mode, r2=T.pearson_r2(y, out),
                                 r2d=T.pearson_r2(y[dm], out[dm]),
                                 mae=float(np.mean(np.abs(y - out))), bias=float(np.mean(out - y))))
        print(tag, "готово", flush=True)
    print(pd.DataFrame(rows).round(4).to_string(index=False))


if __name__ == "__main__":
    main()
