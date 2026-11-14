"""Лаборатория, серия 13: квантильный маршрутизатор (hurdle-модель).

Гипотеза: факт — «пила» (дефектные сегменты проваливаются, бездефектные лежат
на полке модальной стенки), медианный ансамбль её сглаживает. Вместо медианы —
маршрутизация между нижним (q05) и верхним (q95) квантилем через вероятность
дефекта P от классификатора на had_defect:
  prob   = −P (чистая форма от классификатора)
  soft   = P·q05 + (1−P)·q95
  hard_t = where(P>t, q05, q95), t ∈ {0.3, 0.5, 0.7}
  mix    = (ens + soft)/2
Референс — ens: средний прогноз 3 бустингов (как lab12.fit_eval). Всё обучается
заново на split=='train' (artifacts/models.joblib дообучен на валидации —
утечка). Прошедшие критерий (прирост против ref на обеих метриках и всех
3 сидах) подтверждаются с полным ансамблем (3 бустинга + AFT) в роли ens.
Запуск: uvx --with-requirements requirements.txt python experiments/lab13_quantile_router.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from catboost import CatBoostClassifier  # noqa: E402
from sklearn.metrics import roc_auc_score  # noqa: E402

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin.train import (CASES, MODEL_FAMILIES, fit_aft, make_model,  # noqa: E402
                            pearson_r2, survival_labels)

SEEDS = (42, 7, 2024)
THRESHOLDS = (0.3, 0.5, 0.7)


def smooth5(va: pd.DataFrame, pred: np.ndarray) -> np.ndarray:
    s = pd.Series(pred, index=va.index)
    return (s.groupby([va["id"], va["end"]])
             .transform(lambda x: x.rolling(5, center=True, min_periods=1).median()).values)


# ------------------------------------------------------- компоненты на (case, seed)
def fit_components(ds, case, seed, full=False):
    """ens (3 бустинга; full — плюс AFT как lab12.fit_eval_full), квантильные
    CatBoost q05/q95, классификатор дефекта P. Обучение только на train."""
    C.SEED = seed
    cfg = CASES[case]
    feats = F.case_features(ds, case)
    sub = ds[ds["kind"].isin(cfg["train_kinds"])]
    tr = sub[sub["split"] == "train"]
    va = ds[ds["split"] == cfg["val_split"]].sort_values(["id", "end", "segment_id"])

    preds = []
    for fam in MODEL_FAMILIES:
        m = make_model(fam)
        m.fit(tr[feats], tr["y"])
        preds.append(m.predict(va[feats]))
    if full:
        import xgboost
        aft = fit_aft(tr[feats], tr["aft_lb"].values, tr["aft_ub"].values,
                      dist=cfg["aft"]["dist"], sigma=cfg["aft"]["sigma"])
        preds.append(va["wt_nom"].values - aft.predict(xgboost.DMatrix(va[feats])))
    ens = np.mean(preds, axis=0)

    quants = {}
    for alpha, tag in ((0.05, "q05"), (0.95, "q95")):
        m = make_model("catboost", alpha=alpha)
        m.fit(tr[feats], tr["y"])
        quants[tag] = m.predict(va[feats])

    clf = CatBoostClassifier(iterations=600, learning_rate=0.05, depth=6,
                             random_seed=seed, verbose=0)
    clf.fit(tr[feats], tr["had_defect"].astype(int))
    p = clf.predict_proba(va[feats])[:, 1]
    auc = roc_auc_score(va["had_defect"].astype(int).values, p)
    return va, ens, quants["q05"], quants["q95"], p, auc


def variants(ens, q05, q95, p) -> dict[str, np.ndarray]:
    out = {"ref": ens, "prob": -p, "soft": p * q05 + (1 - p) * q95}
    for t in THRESHOLDS:
        out[f"hard_{t}"] = np.where(p > t, q05, q95)
    out["mix"] = (ens + out["soft"]) / 2
    return out


def eval_case(ds, case, full=False):
    """{вариант: [{r2, sm5} по сидам]} + AUC по сидам."""
    scores, aucs = {}, []
    for seed in SEEDS:
        va, ens, q05, q95, p, auc = fit_components(ds, case, seed, full=full)
        aucs.append(auc)
        y = va["y"].values
        for name, pred in variants(ens, q05, q95, p).items():
            scores.setdefault(name, []).append(
                {"r2": pearson_r2(y, pred), "sm5": pearson_r2(y, smooth5(va, pred))})
    return scores, aucs


def report(case: str, scores: dict, aucs: list[float]) -> list[str]:
    print(f"\n== {case}: AUC классификатора по сидам:",
          " ".join(f"{a:.3f}" for a in aucs),
          f"(mean {np.mean(aucs):.3f})")
    rows, passed = [], []
    ref = scores["ref"]
    for name, res in scores.items():
        r = {"case": case, "variant": name}
        for k in ("r2", "sm5"):
            v = np.array([x[k] for x in res])
            r[f"{k}_mean"], r[f"{k}_std"] = round(v.mean(), 4), round(v.std(), 4)
            r[f"{k}_seeds"] = " ".join(f"{x:.3f}" for x in v)
        ok = name != "ref" and all(
            res[i]["r2"] > ref[i]["r2"] and res[i]["sm5"] > ref[i]["sm5"]
            for i in range(len(SEEDS)))
        r["pass"] = "+" if ok else ""
        if ok:
            passed.append(name)
        rows.append(r)
    print(pd.DataFrame(rows).to_string(index=False), flush=True)
    return passed


def main() -> None:
    ds, _ = F.build_all(extended=True)
    ds = survival_labels(ds)  # aft_lb/ub для подтверждения с AFT

    for case in ("case1", "case2"):
        va = ds[ds["split"] == CASES[case]["val_split"]]
        tr = ds[(ds["kind"].isin(CASES[case]["train_kinds"])) & (ds["split"] == "train")]
        print(f"{case}: доля had_defect train={tr['had_defect'].mean():.3f} "
              f"val={va['had_defect'].mean():.3f} (n_val={len(va)})")

    passed_all = {}
    for case in ("case1", "case2"):
        scores, aucs = eval_case(ds, case)
        passed_all[case] = report(case, scores, aucs)

    print("\nпрошли критерий (все 3 сида, обе метрики):",
          {c: v or "—" for c, v in passed_all.items()})

    # --------------------------------- подтверждение с полным ансамблем (+AFT)
    for case, names in passed_all.items():
        if not names:
            continue
        print(f"\n== подтверждение {case} с полным ансамблем (3 бустинга + AFT):")
        scores, aucs = eval_case(ds, case, full=True)
        keep = {k: v for k, v in scores.items() if k == "ref" or k in names}
        report(case, keep, aucs)
    C.SEED = 42


if __name__ == "__main__":
    main()
