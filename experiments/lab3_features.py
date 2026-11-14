"""Лаборатория, серия 3: новые признаки на лучших композициях из серии 2.

Признаки: УЗТ, p25-профиль прошлого ВТД, нормированная плотность дефектов,
взаимодействия низина x медленный поток. Абляция: без новых / с новыми.
Запуск: uvx --with-requirements requirements.txt python experiments/lab3_features.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin.train import MODEL_FAMILIES, make_model, pearson_r2  # noqa: E402

NEW_FEATS = ["uzt_dist", "uzt_min_250", "uzt_loss_rate",
             "prev_p25_sm21", "prev_ndef_norm", "x_pool_slow", "x_trap_wc"]


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
    feats_old = [f for f in feats_all if f not in NEW_FEATS]
    is_comm = ds["kind"] == "comm2vtd"
    all_true = pd.Series(True, index=ds.index)

    plans = [
        ("case1: старые признаки (реф)", "val_case1", all_true, feats_old),
        ("case1: + новые признаки",      "val_case1", all_true, feats_all),
        ("case2: старые признаки (реф)", "val_case2", is_comm, feats_old),
        ("case2: + новые признаки",      "val_case2", is_comm, feats_all),
    ]
    rows = []
    for name, split, mask, feats in plans:
        rows.append({"plan": name, "n_feats": len(feats),
                     **fit_eval(ds, split, mask, feats)})
        print(pd.DataFrame(rows).to_string(index=False))
        print("-" * 70)


if __name__ == "__main__":
    main()
