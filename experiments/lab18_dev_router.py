"""Лаборатория, серия 18: маршрутизация по разбросу квантилей (кейс 1).

Идея пользователя: база смотрит на q50, но там, где отклонение сильное,
через if переключаться на q05/q95. Триггер — собственная неопределённость
модели: растянутый нижний хвост (gap_lo = q50 − q05) — подозрение на язву.
Варианты против боевой базы (LGBM+XGB+AFT, медиана):
  hard_t  — gap_lo выше t-го перцентиля -> q05, иначе база; t ∈ {60, 70, 80};
  sym     — то же + симметрично вверх (gap_up выше 80-го перцентиля -> q95);
  soft_k  — база + k·(gap_up − gap_lo)/2 — непрерывная версия (скошенность
            условного распределения тянет прогноз в длинный хвост).
Каждый вариант оценивается сырым и как база боевого бленда (bl_*).
Диагностика: AUC gap_lo как детектора had_defect — знает ли разброс что-то
сверх классификатора (его AUC 0.97).
REF — боевая база. pass = bl_sm5 лучше REF на всех 3 сидах.
Запуск: uvx --with-requirements requirements.txt python experiments/lab18_dev_router.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import xgboost  # noqa: E402
from sklearn.metrics import roc_auc_score  # noqa: E402

from lab13_quantile_router import SEEDS, smooth5  # noqa: E402
from lab16_member_combos import AFT_CFG, split_case  # noqa: E402
from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin.train import (blend_prob, fit_aft, fit_clf, make_model,  # noqa: E402
                            pearson_r2, survival_labels)

CASE = "case1"
THRESH = (0.6, 0.7, 0.8)
SOFT_K = (0.5, 1.0)


def main() -> None:
    ds, _ = F.build_all(extended=True)
    ds = survival_labels(ds)

    scores: dict[str, list[dict]] = {}
    aucs = []
    for seed in SEEDS:
        feats, tr, va = split_case(ds, CASE, seed)
        y = va["y"].values
        aft = fit_aft(tr[feats], tr["aft_lb"].values, tr["aft_ub"].values,
                      **AFT_CFG[CASE])
        aft_pred = va["wt_nom"].values - aft.predict(xgboost.DMatrix(va[feats]))
        p_def = fit_clf(tr[feats], tr["had_defect"]).predict_proba(va[feats])[:, 1]

        q = {}
        for alpha in (0.05, 0.5, 0.95):
            C.SEED = seed
            q[alpha] = np.mean(
                [make_model(fam, alpha=alpha).fit(tr[feats], tr["y"])
                 .predict(va[feats]) for fam in ("lgbm", "xgb")], axis=0)
        # боевая база: LGBM(0.5) + XGB(0.5) + AFT; внутри q[0.5] два члена
        # уже усреднены, поэтому вес 2:1
        base = (2 * q[0.5] + aft_pred) / 3
        gap_lo, gap_up = q[0.5] - q[0.05], q[0.95] - q[0.5]
        aucs.append(roc_auc_score(va["had_defect"].astype(int).values, gap_lo))

        variants = {"ref": base}
        for t in THRESH:
            variants[f"hard_{t}"] = np.where(
                gap_lo > np.quantile(gap_lo, t), q[0.05], base)
        up = gap_up > np.quantile(gap_up, 0.8)
        variants["sym"] = np.where(
            gap_lo > np.quantile(gap_lo, 0.8), q[0.05], np.where(up, q[0.95], base))
        for k in SOFT_K:
            variants[f"soft_{k}"] = base + k * (gap_up - gap_lo) / 2

        for name, pred in variants.items():
            bl = blend_prob(pred, p_def, 1.0)
            scores.setdefault(name, []).append(
                {"r2": pearson_r2(y, pred), "sm5": pearson_r2(y, smooth5(va, pred)),
                 "bl_r2": pearson_r2(y, bl),
                 "bl_sm5": pearson_r2(y, smooth5(va, bl))})
        print(f"seed {seed}: готово", flush=True)
    C.SEED = 42

    print("AUC gap_lo как детектора дефекта по сидам:",
          " ".join(f"{a:.3f}" for a in aucs), f"(mean {np.mean(aucs):.3f})")
    rows, ref = [], scores["ref"]
    for name, res in scores.items():
        r = {"variant": name}
        for k in res[0]:
            v = np.array([x[k] for x in res])
            r[f"{k}_mean"] = round(v.mean(), 4)
            if k == "bl_sm5":
                r[f"{k}_seeds"] = " ".join(f"{x:.3f}" for x in v)
        r["pass"] = "+" if name != "ref" and all(
            res[i]["bl_sm5"] > ref[i]["bl_sm5"] for i in range(len(SEEDS))) else ""
        if name == "ref":
            r["pass"] = "REF"
        rows.append(r)
    print(pd.DataFrame(rows).to_string(index=False), flush=True)


if __name__ == "__main__":
    main()
