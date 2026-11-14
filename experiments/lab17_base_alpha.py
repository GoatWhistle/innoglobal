"""Лаборатория, серия 17: из какого квантиля смотреть базе кейса 1.

Вопрос пользователя: таргет — минимум стенки, зачем база из центра (alpha
0.5)? Проверяем: члены базы LGBM+XGB учатся на нижний квантиль
alpha ∈ {0.2, 0.3, 0.4, 0.5}, AFT и классификатор без изменений, поверх —
боевой бленд + медиана 5. Пирсон сдвиго-инвариантен, так что выиграть может
только другая ФОРМА условного квантиля, не уровень; MAE бленда — справочно
(бленд возвращает уровень базы, у низкого квантиля он занижен).
REF — alpha 0.5 (боевой конфиг после lab16). pass = bl_sm5 лучше REF на всех
3 сидах.
Запуск: uvx --with-requirements requirements.txt python experiments/lab17_base_alpha.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import xgboost  # noqa: E402

from lab13_quantile_router import SEEDS, smooth5  # noqa: E402
from lab16_member_combos import AFT_CFG, split_case  # noqa: E402
from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin.train import (blend_prob, fit_aft, fit_clf, make_model,  # noqa: E402
                            pearson_r2, survival_labels)

CASE = "case1"
ALPHAS = (0.2, 0.3, 0.4, 0.5)
REF_ALPHA = 0.5


def main() -> None:
    ds, _ = F.build_all(extended=True)
    ds = survival_labels(ds)

    scores: dict[float, list[dict]] = {}
    for seed in SEEDS:
        feats, tr, va = split_case(ds, CASE, seed)
        y = va["y"].values
        aft = fit_aft(tr[feats], tr["aft_lb"].values, tr["aft_ub"].values,
                      **AFT_CFG[CASE])
        aft_pred = va["wt_nom"].values - aft.predict(xgboost.DMatrix(va[feats]))
        p_def = fit_clf(tr[feats], tr["had_defect"]).predict_proba(va[feats])[:, 1]
        for alpha in ALPHAS:
            C.SEED = seed
            parts = [make_model(fam, alpha=alpha).fit(tr[feats], tr["y"])
                     .predict(va[feats]) for fam in ("lgbm", "xgb")]
            base = np.mean(parts + [aft_pred], axis=0)
            bl = blend_prob(base, p_def, 1.0)
            bl_sm = smooth5(va, bl)
            scores.setdefault(alpha, []).append(
                {"r2": pearson_r2(y, base), "sm5": pearson_r2(y, smooth5(va, base)),
                 "bl_r2": pearson_r2(y, bl), "bl_sm5": pearson_r2(y, bl_sm),
                 "bl_mae": float(np.mean(np.abs(y - bl_sm)))})
        print(f"seed {seed}: готово", flush=True)
    C.SEED = 42

    rows, ref = [], scores[REF_ALPHA]
    for alpha, res in scores.items():
        r = {"alpha": alpha}
        for k in res[0]:
            v = np.array([x[k] for x in res])
            r[f"{k}_mean"] = round(v.mean(), 4)
            if k == "bl_sm5":
                r[f"{k}_seeds"] = " ".join(f"{x:.3f}" for x in v)
        r["pass"] = "+" if alpha != REF_ALPHA and all(
            res[i]["bl_sm5"] > ref[i]["bl_sm5"] for i in range(len(SEEDS))) else ""
        if alpha == REF_ALPHA:
            r["pass"] = "REF"
        rows.append(r)
    print(pd.DataFrame(rows).to_string(index=False), flush=True)


if __name__ == "__main__":
    main()
