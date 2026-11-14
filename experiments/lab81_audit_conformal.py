"""Лаборатория, серия 81 (аудит exp/integrate): конформные полуширины кейса 1.

train.run берёт полуширины p10-p90 / p05-p95 из невязок прод-предиктора на ПОСЛЕДНЕМ блоке
валидации — case1_measured (сдвиг прошлого пропуска измерен по самой паре через скрытый 2023,
т.е. оракул геометрии). Здесь: тот же путь валидации (honest-строки, сид 42), полуширины по
каждому блоку и перекрёстное покрытие (полуширины одного блока на невязках другого), плюс
self22 нельзя (другой датасет) — только два блока основного датасета.
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import train as T  # noqa: E402


def main():
    ds = T.survival_labels(pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv",
                                       parse_dates=["start", "end"]))
    cfg = T.CASES["case1"]
    feats = F.case_features(ds, "case1")
    sub = ds[ds["kind"].isin(cfg["train_kinds"])]
    honest = sub[sub["split"] == "train_honest"]
    tr = sub[sub["split"] == "train"].copy()
    key = ["id", "start", "end", "kind", "segment_id"]
    mask = tr["id"].isin(honest["id"].unique()).to_numpy()
    rep = honest.set_index(key).loc[pd.MultiIndex.from_frame(tr.loc[mask, key])]
    for c in rep.columns.drop("split"):
        tr.loc[mask, c] = rep[c].to_numpy()
    X, y = tr[feats], tr["y"]
    bag = T.fit_bag(X, y, tr["aft_lb"].values, tr["aft_ub"].values, cfg["params"], cfg["aft"],
                    families=cfg["families"])
    clf = T.fit_clf(X, tr["had_defect"])
    q05m = T.fit_q05_pair(X, y, cfg["params"])
    res = {}
    for blk in ("val_case1", "val_case1_measured"):
        v = ds[ds["split"] == blk]
        e = T.predict_bag(bag, v[feats], v["wt_nom"].values, agg=cfg["member_agg"])["ensemble"]
        q05 = np.mean([m.predict(v[feats]) for m in q05m], axis=0)
        eb = T.blend_prob(e, clf.predict_proba(v[feats])[:, 1], cfg["blend_w"], gap=e - q05,
                          gap_w=cfg["gap_w"])
        p = np.clip(T.case1_stat_predictors(v, eb)["dens_quant_cal"], 0.5, v["wt_nom"].values)
        res[blk] = v["y"].values - p
        print(blk, "r2", round(T.pearson_r2(v["y"].values, p), 4), "MAE",
              round(float(np.mean(np.abs(res[blk]))), 3),
              "полуширины", {k: round(x, 3) for k, x in T.conformal_halfwidths(res[blk]).items()},
              flush=True)
    for a in res:
        hw = T.conformal_halfwidths(res[a])
        for b in res:
            cov = {k: round(float(np.mean(np.abs(res[b]) <= w)), 3) for k, w in hw.items()}
            print(f"полуширины из {a} -> покрытие на {b}: {cov}", flush=True)


if __name__ == "__main__":
    main()
