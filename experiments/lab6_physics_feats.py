"""Лаборатория, серия 6: абляция физико-химических признаков из серии 5.

Группы: эпохи ингибирования / глубина кармана рельефа / химия воды.
Референс — лучшие конфигурации серии 4 (case1: база; case2: база+УЗТ).
Запуск: uvx --with-requirements requirements.txt python experiments/lab6_physics_feats.py
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
    "era": ["yrs_pre_inhib", "yrs_post_inhib"],
    "pocket": ["pocket_depth"],
    "chem": ["grav_cl", "grav_mineralization"],
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
    is_comm = ds["kind"] == "comm2vtd"
    all_true = pd.Series(True, index=ds.index)

    rows = []
    for case, split, mask in (("case1", "val_case1", all_true),
                              ("case2", "val_case2", is_comm)):
        ref = [f for f in F.case_features(ds, case) if f not in ALL_NEW]
        for gname, gfeats in ([("реф. серии 4", [])] + list(GROUPS.items())
                              + [("все физ.-хим.", ALL_NEW)]):
            rows.append({"case": case, "add": gname,
                         **fit_eval(ds, split, mask, ref + gfeats)})
            print(pd.DataFrame(rows).to_string(index=False))
            print("-" * 60)


if __name__ == "__main__":
    main()
