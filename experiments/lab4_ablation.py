"""Лаборатория, серия 4: групповая абляция новых признаков по кейсам.

Группы: УЗТ / профильные (p25, ndef_norm) / взаимодействия.
Запуск: uvx --with-requirements requirements.txt python experiments/lab4_ablation.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin.train import MODEL_FAMILIES, make_model, pearson_r2  # noqa: E402

GROUPS = {
    "uzt": ["uzt_dist", "uzt_min_250", "uzt_loss_rate"],
    "prof": ["prev_p25_sm21", "prev_ndef_norm"],
    "inter": ["x_pool_slow", "x_trap_wc"],
}
ALL_NEW = [f for g in GROUPS.values() for f in g]


def fit_eval(ds, val_split, train_mask, feats) -> dict:
    tr = ds[(ds["split"] == "train") & train_mask]
    va = ds[ds["split"] == val_split]
    preds = {}
    for fam in MODEL_FAMILIES:
        m = make_model(fam)
        m.fit(tr[feats], tr["y"])
        preds[fam] = m.predict(va[feats])
    preds["ens"] = np.mean([preds[f] for f in MODEL_FAMILIES], axis=0)
    y = va["y"].values
    return {"catboost": round(pearson_r2(y, preds["catboost"]), 4),
            "ens": round(pearson_r2(y, preds["ens"]), 4)}


def main() -> None:
    np.random.seed(C.SEED)
    ds, _ = F.build_all(extended=True)
    feats_all = F.feature_columns(ds)
    base = [f for f in feats_all if f not in ALL_NEW]
    is_comm = ds["kind"] == "comm2vtd"
    all_true = pd.Series(True, index=ds.index)

    rows = []
    for case, split, mask in (("case1", "val_case1", all_true),
                              ("case2", "val_case2", is_comm)):
        for gname, gfeats in [("база", [])] + list(GROUPS.items()) + [("все", ALL_NEW)]:
            feats = base + gfeats
            rows.append({"case": case, "add": gname,
                         **fit_eval(ds, split, mask, feats)})
            print(pd.DataFrame(rows).to_string(index=False))
            print("-" * 60)


if __name__ == "__main__":
    main()
