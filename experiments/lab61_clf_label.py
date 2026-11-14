"""Лаборатория 61: денойз метки классификатора дефекта (кейс 1).

had_defect — тоже шумная метка (чувствительность снаряда, порог обнаружения). База
формы — принятый shrink 0.5/5 (lab60), уровень от базы на y; меняется только метка avg3.
Варианты: ref had_defect; any3 — дефект в ±1 сегменте; ndef2 — ≥2 дефектов в сегменте;
deep — минимум тоньше 0.9 номинала; soft5 — регрессоры avg3 на доле дефектных в ±2.
Оценка по реальному минимуму: r², r2d (только дефектные), MAE прод-пути; 8 сидов.
"""
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import lab60_denoise as L  # noqa: E402
from pipetwin import config as C  # noqa: E402
if os.environ.get("LAB_PROC"):  # честный датасет lab62
    C.PROCESSED_DIR = Path(__file__).resolve().parents[1] / os.environ["LAB_PROC"]
from pipetwin import features as F  # noqa: E402

SEEDS = (42, 7, 2024, 1, 2, 3, 123, 777)


def roll(ds, col, w, how):
    g = ds.sort_values(L.GRP + ["segment_id"]).groupby(L.GRP)[col]
    f = (lambda s: s.rolling(w, center=True, min_periods=1).max()) if how == "max" else \
        (lambda s: s.rolling(w, center=True, min_periods=1).mean())
    return g.transform(f).reindex(ds.index)


def avg3(X, y, Xv, seed, reg=False):
    from catboost import CatBoostClassifier, CatBoostRegressor
    from lightgbm import LGBMClassifier, LGBMRegressor
    from xgboost import XGBClassifier, XGBRegressor
    if reg:
        ms = [CatBoostRegressor(iterations=600, learning_rate=0.05, depth=6,
                                random_seed=seed, verbose=0, thread_count=8),
              LGBMRegressor(n_estimators=600, learning_rate=0.05, num_leaves=31,
                            random_state=seed, verbosity=-1, n_jobs=8),
              XGBRegressor(n_estimators=600, learning_rate=0.05, max_depth=6,
                           random_state=seed, verbosity=0, n_jobs=8)]
        return np.mean([m.fit(X, y).predict(Xv) for m in ms], axis=0)
    ms = [CatBoostClassifier(iterations=600, learning_rate=0.05, depth=6,
                             random_seed=seed, verbose=0, thread_count=8),
          LGBMClassifier(n_estimators=600, learning_rate=0.05, num_leaves=31,
                         random_state=seed, verbosity=-1, n_jobs=8),
          XGBClassifier(n_estimators=600, learning_rate=0.05, max_depth=6,
                        random_state=seed, verbosity=0, n_jobs=8)]
    return np.mean([m.fit(X, y.astype(int)).predict_proba(Xv)[:, 1] for m in ms], axis=0)


def main():
    ds = pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv", parse_dates=["start", "end"])
    L.CFG_FEATS = feats = F.case_features(ds, "case1")
    sub = ds[ds["kind"].isin(L.CFG["train_kinds"])]
    tgt = L.targets(sub)
    tr = sub[sub["split"] == "train"]
    va = ds[ds["split"] == L.CFG["val_split"]]
    hd = va["had_defect"].values.astype(bool)
    y, pm, wt, Xv = va["y"].values, va["prev_min"].values, va["wt_nom"].values, va[feats]
    w1 = np.ones(len(tr))
    ens_lvl = L.fit_ens(tr, Xv, wt, tr["y"].values, w1)[0]
    ens, q05 = L.fit_ens(tr, Xv, wt, tgt["sh0.5_w5"].loc[tr.index].values, w1)
    labels = {
        "ref": (tr["had_defect"], False),
        "any3": (roll(tr.assign(h=tr["had_defect"].astype(int)), "h", 3, "max"), False),
        "ndef2": (tr["y_ndef"] >= 2, False),
        "deep": (tr["y"] < 0.9 * tr["wt_nom"], False),
        "soft5": (roll(tr.assign(h=tr["had_defect"].astype(float)), "h", 5, "mean"), True),
    }
    rows = []
    for name, (lab, reg) in labels.items():
        print(name, "доля положительных", round(float(np.mean(lab)), 3), flush=True)
        for s in SEEDS:
            p = (L.CACHE[f"p_{s}"] if name == "ref"
                 else avg3(tr[feats], lab.values, Xv, s, reg))
            rows.append(dict(variant=name, seed=s,
                             **L.evaluate(y, ens, q05, p, pm, wt, hd, ens_lvl)))
        print(name, "готово", flush=True)
    df = pd.DataFrame(rows)
    ref = df[df.variant == "ref"].set_index("seed")
    for k in ("r2", "r2d", "mae"):
        df[f"d_{k}"] = df[k].values - ref.loc[df.seed, k].values
    g = df.groupby("variant", sort=False).agg(
        r2=("r2", "mean"), r2_phys=("r2_phys", "mean"), r2d=("r2d", "mean"),
        mae=("mae", "mean"), rmse=("rmse", "mean"), mape=("mape", "mean"),
        r2_wins=("d_r2", lambda x: int((x > 0).sum())),
        r2d_wins=("d_r2d", lambda x: int((x > 0).sum())),
        mae_wins=("d_mae", lambda x: int((x < 0).sum())))
    print(g.round(4).to_string(), flush=True)


if __name__ == "__main__":
    main()
