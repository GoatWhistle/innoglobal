"""Лаборатория, серия 16: перебор составов ансамбля, без Optuna.

Вопрос пользователя: а если ансамбль не из всех четырёх членов — скажем,
только CatBoost'ы или только LGBM? Перебираем все 15 непустых подмножеств
{catboost, lgbm, xgb, aft}; каждое в двух режимах:
  def  — член семейства с параметрами по умолчанию;
  grid — член = среднее семейства по train.PARAM_GRID (6 наборов
         глубина × темп) — «настройка» без Optuna.
Без кэша (по просьбе пользователя): каждая комбинация обучает всех своих
членов с нуля на каждом сиде. Для кейса 1 каждое комбо оценивается ещё
и как база бленда с классификатором дефекта (боевой предиктор):
bl_r2 / bl_sm5 — после blend_prob(…, P, 1.0) и сглаживания.
Целевая метрика: кейс 1 — bl_sm5 (как сдаётся), кейс 2 — r2 (сдаётся сырой).
pass = лучше референса на целевой метрике на всех 3 сидах.
Референсы: кейс 1 — cb+lgb+xgb+aft def (боевой), кейс 2 — lgb grid (боевой).
Запуск: uvx --with-requirements requirements.txt python experiments/lab16_member_combos.py
"""
import sys
from itertools import combinations
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import xgboost  # noqa: E402

from lab13_quantile_router import SEEDS, smooth5  # noqa: E402
from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin.train import (CASES, PARAM_GRID, blend_prob, fit_aft,  # noqa: E402
                            fit_clf, make_model, pearson_r2, survival_labels)

FAMS = ("catboost", "lgbm", "xgb")
SHORT = {"catboost": "cb", "lgbm": "lgb", "xgb": "xgb"}
# у кейса 2 в боевом конфиге aft=None — для перебора берём его старую сигму
AFT_CFG = {"case1": dict(dist="normal", sigma=2.0),
           "case2": dict(dist="normal", sigma=0.5)}
REF = {"case1": ("cb+lgb+xgb+aft", "def"), "case2": ("lgb", "grid")}
TARGET = {"case1": "bl_sm5", "case2": "r2"}


def split_case(ds, case, seed):
    C.SEED = seed
    cfg = CASES[case]
    feats = F.case_features(ds, case)
    sub = ds[ds["kind"].isin(cfg["train_kinds"])]
    tr = sub[sub["split"] == "train"]
    va = ds[ds["split"] == cfg["val_split"]].sort_values(["id", "end", "segment_id"])
    return feats, tr, va


def fit_combo(case, tr, va, feats, boosters, with_aft, mode, seed):
    """Обучение всех членов комбинации с нуля и их среднее."""
    C.SEED = seed
    parts = []
    for fam in boosters:
        if mode == "grid":
            parts.append(np.mean(
                [make_model(fam, dict(p[fam])).fit(tr[feats], tr["y"])
                 .predict(va[feats]) for p in PARAM_GRID], axis=0))
        else:
            parts.append(make_model(fam).fit(tr[feats], tr["y"]).predict(va[feats]))
    if with_aft:
        aft = fit_aft(tr[feats], tr["aft_lb"].values, tr["aft_ub"].values,
                      **AFT_CFG[case])
        parts.append(va["wt_nom"].values - aft.predict(xgboost.DMatrix(va[feats])))
    return np.mean(parts, axis=0)


def combos():
    """15 подмножеств × режимы; подмножество из одного aft режима не имеет."""
    members = FAMS + ("aft",)
    for r in range(1, len(members) + 1):
        for sub in combinations(members, r):
            boosters = [f for f in sub if f != "aft"]
            modes = ("def", "grid") if boosters else ("def",)
            for mode in modes:
                name = "+".join(SHORT.get(f, f) for f in sub)
                yield name, mode, boosters, "aft" in sub


def main() -> None:
    ds, _ = F.build_all(extended=True)
    ds = survival_labels(ds)

    for case in ("case1", "case2"):
        scores: dict[tuple, list[dict]] = {}
        for seed in SEEDS:
            feats, tr, va = split_case(ds, case, seed)
            y = va["y"].values
            p_def = (fit_clf(tr[feats], tr["had_defect"])
                     .predict_proba(va[feats])[:, 1] if case == "case1" else None)
            for name, mode, boosters, with_aft in combos():
                pred = fit_combo(case, tr, va, feats, boosters, with_aft, mode, seed)
                row = {"r2": pearson_r2(y, pred),
                       "sm5": pearson_r2(y, smooth5(va, pred))}
                if p_def is not None:
                    bl = blend_prob(pred, p_def, 1.0)
                    row["bl_r2"] = pearson_r2(y, bl)
                    row["bl_sm5"] = pearson_r2(y, smooth5(va, bl))
                scores.setdefault((name, mode), []).append(row)
            print(f"{case} seed {seed}: готово", flush=True)
        C.SEED = 42

        tgt, ref = TARGET[case], scores[REF[case]]
        rows = []
        for (name, mode), res in scores.items():
            r = {"combo": name, "mode": mode}
            for k in res[0]:
                v = np.array([x[k] for x in res])
                r[f"{k}_mean"] = round(v.mean(), 4)
                if k == tgt:
                    r[f"{k}_seeds"] = " ".join(f"{x:.3f}" for x in v)
            r["pass"] = "+" if (name, mode) != REF[case] and all(
                res[i][tgt] > ref[i][tgt] for i in range(len(SEEDS))) else ""
            if (name, mode) == REF[case]:
                r["pass"] = "REF"
            rows.append(r)
        df = (pd.DataFrame(rows)
              .sort_values(f"{tgt}_mean", ascending=False)
              .reset_index(drop=True))
        print(f"\n== {case} (цель: {tgt}, REF: {'+'.join(REF[case])})")
        print(df.to_string(index=False), flush=True)


if __name__ == "__main__":
    main()
