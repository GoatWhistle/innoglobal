"""Лаборатория, серия 7: survival-модель (XGBoost AFT с цензурированием).

Идея: ВТД не видит дефекты мельче порога чувствительности, поэтому
"сегмент без дефектов" — не "потеря = 0", а интервальная цензура
[~0, порог обнаружения]. AFT обрабатывает это честно, вместо нашего
заполнения таргета номиналом.

Таргет — потеря металла (мм); прогноз толщины = const - потеря,
Пирсон внутри трубы от константы не зависит.
Запуск: uvx --with-requirements requirements.txt python experiments/lab7_survival.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin.train import pearson_r2  # noqa: E402

EPS = 0.01  # мм, нижняя граница потери (AFT требует положительное "время")


def make_labels(ds: pd.DataFrame) -> pd.DataFrame:
    """Интервальные метки потери металла для AFT."""
    ds = ds.copy()
    loss = (ds["wt_nom"] - ds["y"]).clip(lower=EPS)
    # порог обнаружения пропуска: минимальная зафиксированная потеря
    # среди дефектных сегментов пары (но не менее 0.3 мм)
    det = (ds[ds["had_defect"]].groupby(["id", "end"])
           .apply(lambda g: max(0.3, float((g["wt_nom"] - g["y"]).clip(lower=EPS).min())),
                  include_groups=False))
    thr = ds.set_index(["id", "end"]).index.map(det).to_numpy()
    thr = np.where(np.isnan(thr.astype(float)), 0.3, thr.astype(float))
    ds["lb"] = np.where(ds["had_defect"], loss, EPS)
    ds["ub"] = np.where(ds["had_defect"], loss, thr)
    return ds


def fit_eval(ds, val_split, train_mask, feats, dist="normal", sigma=1.0) -> float:
    tr = ds[(ds["split"] == "train") & train_mask]
    va = ds[ds["split"] == val_split]
    dtr = xgb.DMatrix(tr[feats])
    dtr.set_float_info("label_lower_bound", tr["lb"].values)
    dtr.set_float_info("label_upper_bound", tr["ub"].values)
    params = dict(objective="survival:aft", aft_loss_distribution=dist,
                  aft_loss_distribution_scale=sigma, tree_method="hist",
                  learning_rate=0.05, max_depth=6, seed=C.SEED)
    bst = xgb.train(params, dtr, num_boost_round=600)
    pred_loss = bst.predict(xgb.DMatrix(va[feats]))
    # толщина = const - потеря; Пирсону важна только форма
    return round(pearson_r2(va["y"].values, -pred_loss), 4)


def main() -> None:
    np.random.seed(C.SEED)
    ds, _ = F.build_all(extended=True)
    ds = make_labels(ds)
    is_comm = ds["kind"] == "comm2vtd"
    all_true = pd.Series(True, index=ds.index)

    print("Референсы (ансамбль без тюнинга, серии 4-6): case1 0.140, case2 0.093")
    rows = []
    for case, split, mask in (("case1", "val_case1", all_true),
                              ("case2", "val_case2", is_comm)):
        feats = [f for f in F.case_features(ds, case) if f not in ("lb", "ub")]
        for dist in ("normal", "logistic"):
            for sigma in (0.5, 1.0, 2.0):
                r2 = fit_eval(ds, split, mask, feats, dist, sigma)
                rows.append(dict(case=case, dist=dist, sigma=sigma, r2=r2))
        print(pd.DataFrame(rows).to_string(index=False))
        print("-" * 50)


if __name__ == "__main__":
    main()
