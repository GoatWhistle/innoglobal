"""Лаборатория, серия 19: ещё раз q05 — маршрутизация к ней от боевой базы.

Пользователю нравится идея q05; lab13 хоронил её в связке P·q05+(1−P)·q95,
где «чистой» веткой был q95 с мусорной формой. Здесь q05 впрягается иначе:
  soft      — (1−P)·база + P·q05: чистая ветка = боевая база (LGBM+XGB+AFT),
              дефектная = q05; P тянет к q05 ровно там, где ямы вероятны;
  soft_bl   — то же + боевой бленд поверх;
  deep05    — q05, обученная ТОЛЬКО на дефектных сегментах (условная глубина
              ям), в той же маршрутизации; deep05_bl — с блендом;
  zq05_w    — q05 как третья форма: z(база) + z(−P) + w·z(q05), w ∈ {0.5, 1};
  gap±      — z(база) + z(−P) ± 0.5·z(база − q05): спред до q05 со знаком
              (lab18: AUC gap_lo 0.245 — сигнал инвертированный, проверяем оба).
q05 — среднее LGBM+XGB с alpha=0.05 (как база, детерминировано).
Сдаваемая кривая каждого варианта — после медианы-5; REF — боевой бленд.
pass = sm5 финальной кривой лучше REF на всех 3 сидах.
Запуск: uvx --with-requirements requirements.txt python experiments/lab19_q05_routing.py
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
                            pearson_r2, survival_labels, zscore)

CASE = "case1"


def to_mm(shape, ref):
    return zscore(shape) * float(np.std(ref)) + float(np.mean(ref))


def pair_mean(tr, va, feats, alpha, seed, rows=None):
    """Среднее LGBM+XGB на заданном квантиле; rows — подмножество train."""
    C.SEED = seed
    t = tr if rows is None else tr[rows]
    return np.mean([make_model(f, alpha=alpha).fit(t[feats], t["y"])
                    .predict(va[feats]) for f in ("lgbm", "xgb")], axis=0)


def main() -> None:
    ds, _ = F.build_all(extended=True)
    ds = survival_labels(ds)

    scores: dict[str, list[dict]] = {}
    for seed in SEEDS:
        feats, tr, va = split_case(ds, CASE, seed)
        y = va["y"].values
        aft = fit_aft(tr[feats], tr["aft_lb"].values, tr["aft_ub"].values,
                      **AFT_CFG[CASE])
        base = (2 * pair_mean(tr, va, feats, 0.5, seed)
                + va["wt_nom"].values - aft.predict(xgboost.DMatrix(va[feats]))) / 3
        q05 = pair_mean(tr, va, feats, 0.05, seed)
        deep05 = pair_mean(tr, va, feats, 0.05, seed, rows=tr["had_defect"])
        p = fit_clf(tr[feats], tr["had_defect"]).predict_proba(va[feats])[:, 1]

        soft = (1 - p) * base + p * q05
        deep = (1 - p) * base + p * deep05
        variants = {
            "ref": blend_prob(base, p, 1.0),
            "soft": soft,
            "soft_bl": blend_prob(soft, p, 1.0),
            "deep05": deep,
            "deep05_bl": blend_prob(deep, p, 1.0),
            "zq05_0.5": to_mm(zscore(base) + zscore(-p) + 0.5 * zscore(q05), base),
            "zq05_1.0": to_mm(zscore(base) + zscore(-p) + 1.0 * zscore(q05), base),
            "gap+": to_mm(zscore(base) + zscore(-p) + 0.5 * zscore(base - q05), base),
            "gap-": to_mm(zscore(base) + zscore(-p) - 0.5 * zscore(base - q05), base),
        }
        for name, pred in variants.items():
            scores.setdefault(name, []).append(
                {"r2": pearson_r2(y, pred),
                 "sm5": pearson_r2(y, smooth5(va, pred)),
                 "mae": float(np.mean(np.abs(y - smooth5(va, pred))))})
        print(f"seed {seed}: готово", flush=True)
    C.SEED = 42

    rows, ref = [], scores["ref"]
    for name, res in scores.items():
        r = {"variant": name}
        for k in res[0]:
            v = np.array([x[k] for x in res])
            r[f"{k}_mean"] = round(v.mean(), 4)
            if k == "sm5":
                r[f"{k}_seeds"] = " ".join(f"{x:.3f}" for x in v)
        r["pass"] = "+" if name != "ref" and all(
            res[i]["sm5"] > ref[i]["sm5"] for i in range(len(SEEDS))) else ""
        if name == "ref":
            r["pass"] = "REF"
        rows.append(r)
    print(pd.DataFrame(rows).sort_values("sm5_mean", ascending=False)
          .to_string(index=False), flush=True)


if __name__ == "__main__":
    main()
