"""Лаборатория гипотез для бустинга: варианты датасета/таргета -> r² на валидации.

Запуск: uvx --with-requirements requirements.txt python experiments/lab_boosting.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin.train import MODEL_FAMILIES, make_model, pearson_r2  # noqa: E402

MIN_PAIR_STD = 0.05  # мм: пары с константным таргетом не учат ранжированию


def add_z_target(ds: pd.DataFrame) -> pd.DataFrame:
    """z-нормировка таргета внутри пары (труба x пропуск).

    Метрика Пирсона шкалонезависима — уровень толщины паре не нужен,
    важна форма профиля. Вырожденные пары получают вес 0.
    """
    g = ds.groupby(["id", "end"])["y"]
    mu, sd = g.transform("mean"), g.transform("std")
    ds = ds.copy()
    ds["y_z"] = ((ds["y"] - mu) / sd.where(sd > 0)).fillna(0.0)
    ds["w"] = (sd > MIN_PAIR_STD).astype(float)
    return ds


def fit_eval(ds: pd.DataFrame, target: str, weight: bool,
             smooth: int = 0) -> dict:
    feats = [c for c in F.feature_columns(ds) if c not in ("y_z", "w")]
    tr = ds[ds["split"] == "train"]
    if weight:
        tr = tr[tr["w"] > 0]
    X_tr, y_tr = tr[feats], tr[target]

    preds = {}
    for fam in MODEL_FAMILIES:
        m = make_model(fam)
        m.fit(X_tr, y_tr)
        preds[fam] = m.predict(ds[feats])
    preds["ens"] = np.mean([preds[f] for f in MODEL_FAMILIES], axis=0)

    out = {}
    for split in ("val_case1", "val_case2"):
        mask = (ds["split"] == split).values
        y = ds.loc[mask, "y"].values
        for name in ("catboost", "ens"):
            p = np.asarray(preds[name])[mask].copy()
            if smooth:
                p = (pd.DataFrame({"id": ds.loc[mask, "id"].values, "p": p})
                     .groupby("id")["p"]
                     .transform(lambda s: s.rolling(smooth, center=True,
                                                    min_periods=1).median()).values)
            out[f"{split[-5:]}_{name}"] = round(pearson_r2(y, p), 4)
    return out


def main() -> None:
    np.random.seed(C.SEED)
    datasets = {}
    for ext in (False, True):
        ds, _ = F.build_all(extended=ext)
        datasets[ext] = add_z_target(ds)
        n_pairs = ds.groupby(["id", "end", "kind"]).ngroups
        print(f"extended={ext}: пар {n_pairs}, сегментов {len(ds)}")

    variants = [
        ("V0 база (y)",            dict(ext=False, target="y",   weight=False, smooth=0)),
        ("V1 расшир. пары",        dict(ext=True,  target="y",   weight=False, smooth=0)),
        ("V2 z-таргет",            dict(ext=False, target="y_z", weight=True,  smooth=0)),
        ("V3 пары+z",              dict(ext=True,  target="y_z", weight=True,  smooth=0)),
        ("V3 + сглаж.5",           dict(ext=True,  target="y_z", weight=True,  smooth=5)),
        ("V3 + сглаж.9",           dict(ext=True,  target="y_z", weight=True,  smooth=9)),
    ]
    rows = []
    for name, v in variants:
        res = fit_eval(datasets[v["ext"]], v["target"], v["weight"], v["smooth"])
        rows.append({"variant": name, **res})
        print(pd.DataFrame(rows).to_string(index=False))
        print("-" * 70)


if __name__ == "__main__":
    main()
