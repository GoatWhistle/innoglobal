"""Лаборатория, серия 14: вклейка вероятности дефекта в прогноз кейса 1.

lab13: чистая форма классификатора had_defect (prob = −P) бьёт полный ансамбль
по средним (r² 0.236/0.281 против 0.177/0.261), но проигрывает на одном сиде
по sm5 и не имеет шкалы мм (а менторы считают ещё MAE/RMSE/MAPE). Кейс 2
отпал: AUC 0.56. Здесь два способа вернуть мм кейсу 1:
  blend_w — z(ens) + w·z(−P), аффинно обратно в шкалу ens: Пирсон от аффинного
            преобразования не меняется, уровень/разброс мм сохранены;
  prob_mm — z(−P) в шкале ens (предельный blend, MAE-цена чистой формы);
  feat    — P четвёртым признаком в 3 бустинга + AFT; на train P берётся
            out-of-fold по группам труба×пропуск, иначе утечка меток had_defect.
Критерий lab13: прирост против ref (полный ансамбль 3 бустинга + AFT) на r² и
sm5 на всех 3 сидах; MAE — справочно.
Запуск: uvx --with-requirements requirements.txt python experiments/lab14_prob_blend.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import xgboost  # noqa: E402
from catboost import CatBoostClassifier  # noqa: E402
from sklearn.model_selection import GroupKFold  # noqa: E402

from lab13_quantile_router import SEEDS, fit_components, smooth5  # noqa: E402
from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin.train import (CASES, MODEL_FAMILIES, fit_aft, make_model,  # noqa: E402
                            pearson_r2, survival_labels)

CASE = "case1"
WEIGHTS = (0.25, 0.5, 1.0, 2.0)


def z(a: np.ndarray) -> np.ndarray:
    return (a - a.mean()) / a.std()


def to_mm(shape: np.ndarray, ref: np.ndarray) -> np.ndarray:
    """Аффинно переносит форму в уровень/разброс референса (Пирсон инвариантен)."""
    return z(shape) * ref.std() + ref.mean()


def make_clf(seed: int) -> CatBoostClassifier:
    return CatBoostClassifier(iterations=600, learning_rate=0.05, depth=6,
                              random_seed=seed, verbose=0)


def fit_feat(ds: pd.DataFrame, seed: int) -> np.ndarray:
    """Полный ансамбль с P как признаком; на train — OOF по группам."""
    C.SEED = seed
    cfg = CASES[CASE]
    feats = F.case_features(ds, CASE)
    sub = ds[ds["kind"].isin(cfg["train_kinds"])]
    tr = sub[sub["split"] == "train"].copy()
    va = (ds[ds["split"] == cfg["val_split"]]
          .sort_values(["id", "end", "segment_id"]).copy())
    groups = (tr["id"].astype(str) + "_" + tr["end"].astype(str)).values

    oof = np.full(len(tr), np.nan)
    for tri, tei in GroupKFold(n_splits=4).split(tr, groups=groups):
        clf = make_clf(seed)
        clf.fit(tr.iloc[tri][feats], tr.iloc[tri]["had_defect"].astype(int))
        oof[tei] = clf.predict_proba(tr.iloc[tei][feats])[:, 1]
    clf = make_clf(seed)
    clf.fit(tr[feats], tr["had_defect"].astype(int))
    tr["p_def"], va["p_def"] = oof, clf.predict_proba(va[feats])[:, 1]

    feats2 = feats + ["p_def"]
    preds = []
    for fam in MODEL_FAMILIES:
        m = make_model(fam)
        m.fit(tr[feats2], tr["y"])
        preds.append(m.predict(va[feats2]))
    aft = fit_aft(tr[feats2], tr["aft_lb"].values, tr["aft_ub"].values,
                  dist=cfg["aft"]["dist"], sigma=cfg["aft"]["sigma"])
    preds.append(va["wt_nom"].values - aft.predict(xgboost.DMatrix(va[feats2])))
    return np.mean(preds, axis=0)


def main() -> None:
    ds, _ = F.build_all(extended=True)
    ds = survival_labels(ds)

    scores: dict[str, list[dict]] = {}
    for seed in SEEDS:
        va, ens, _, _, p, auc = fit_components(ds, CASE, seed, full=True)
        y = va["y"].values
        variants = {"ref": ens, "prob_mm": to_mm(-p, ens), "feat": fit_feat(ds, seed)}
        for w in WEIGHTS:
            variants[f"blend_{w}"] = to_mm(z(ens) + w * z(-p), ens)
        print(f"seed {seed}: AUC {auc:.3f}", flush=True)
        for name, pred in variants.items():
            scores.setdefault(name, []).append(
                {"r2": pearson_r2(y, pred), "sm5": pearson_r2(y, smooth5(va, pred)),
                 "mae": float(np.mean(np.abs(y - pred)))})
    C.SEED = 42

    rows, ref = [], scores["ref"]
    for name, res in scores.items():
        r = {"variant": name}
        for k in ("r2", "sm5", "mae"):
            v = np.array([x[k] for x in res])
            r[f"{k}_mean"] = round(v.mean(), 4)
            r[f"{k}_seeds"] = " ".join(f"{x:.3f}" for x in v)
        ok = name != "ref" and all(
            res[i]["r2"] > ref[i]["r2"] and res[i]["sm5"] > ref[i]["sm5"]
            for i in range(len(SEEDS)))
        r["pass"] = "+" if ok else ""
        rows.append(r)
    print(pd.DataFrame(rows).to_string(index=False), flush=True)


if __name__ == "__main__":
    main()
