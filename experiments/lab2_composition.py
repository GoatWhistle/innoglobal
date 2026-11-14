"""Лаборатория, серия 2: состав обучающей выборки отдельно под каждый кейс.

Гипотеза: кейс 1 (между ВТД) и кейс 2 (от ввода) требуют разных train-наборов.
Запуск: uvx --with-requirements requirements.txt python experiments/lab2_composition.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin.train import MODEL_FAMILIES, make_model, pearson_r2  # noqa: E402

MIN_PAIR_STD = 0.05


def pair_std(ds: pd.DataFrame) -> pd.Series:
    return ds.groupby(["id", "end"])["y"].transform("std")


def fit_eval(ds: pd.DataFrame, val_split: str, train_mask: pd.Series) -> dict:
    feats = F.feature_columns(ds)
    tr = ds[(ds["split"] == "train") & train_mask]
    va = ds[ds["split"] == val_split]
    X_tr, y_tr = tr[feats], tr["y"]
    preds = {}
    for fam in MODEL_FAMILIES:
        m = make_model(fam)
        m.fit(X_tr, y_tr)
        preds[fam] = m.predict(va[feats])
    preds["ens"] = np.mean([preds[f] for f in MODEL_FAMILIES], axis=0)
    y = va["y"].values
    return {"n_train": len(tr),
            "catboost": round(pearson_r2(y, preds["catboost"]), 4),
            "ens": round(pearson_r2(y, preds["ens"]), 4)}


def main() -> None:
    np.random.seed(C.SEED)
    ds, _ = F.build_all(extended=True)
    sd = pair_std(ds)
    is_comm = ds["kind"] == "comm2vtd"
    is_vtd = ds["kind"] == "vtd2vtd"
    nondegen = sd > MIN_PAIR_STD
    all_true = pd.Series(True, index=ds.index)

    plans = [
        ("case1: все пары (реф V1)",        "val_case1", all_true),
        ("case1: только vtd2vtd",           "val_case1", is_vtd),
        ("case1: все без вырожденных",      "val_case1", nondegen),
        ("case1: vtd2vtd без вырожденных",  "val_case1", is_vtd & nondegen),
        ("case2: все пары (реф V1)",        "val_case2", all_true),
        ("case2: только comm2vtd",          "val_case2", is_comm),
        ("case2: comm2vtd без вырожденных", "val_case2", is_comm & nondegen),
        ("case2: все без вырожденных",      "val_case2", nondegen),
    ]
    rows = []
    for name, split, mask in plans:
        rows.append({"plan": name, **fit_eval(ds, split, mask)})
        print(pd.DataFrame(rows).to_string(index=False))
        print("-" * 70)


if __name__ == "__main__":
    main()
