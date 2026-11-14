"""Лаборатория, серия 15: совет ментора — одна модель + квантильная маршрутизация.

Две идеи ментора:
1. Выкинуть лишние бустинги, оставить одну модель и хорошо настроить.
   Проверяем CatBoost и LightGBM (по validation_report кейса 2 LGBM в одиночку
   0.175 > ансамбль 0.164): default и *_grid — среднее одной семьи по
   train.PARAM_GRID (6 наборов глубина × темп; без Optuna по просьбе
   пользователя, та же сетка, что в сдатке кейса 2).
2. Маршрутизация между q05/q95. В lab13 провалилась: квантили, обученные на
   всех сегментах, сами липнут к полке (бездефектных большинство) — разброса
   нет, маршрутизировать нечего. Лечим условными моделями:
     deep  — модель стенки только на дефектных сегментах;
     shelf — только на чистых;
     hurdle = P·deep + (1−P)·shelf, P — классификатор had_defect
              (AUC 0.97 на кейсе 1); разброс приходит из deep.
   Плюс mentor-вариант «одна модель + P»: blend z(model) + z(−P) в шкале мм
   (lab14: blend_1.0 с ансамблем прошёл критерий — r² 0.268 / sm5 0.315 / MAE
   0.360 против ref 0.177 / 0.261 / 0.387).
Кейс 2 — только одиночные модели: AUC 0.56, маршрутизация там не работает.
Критерий lab13: прирост против ref (полный ансамбль 3 бустинга + AFT) на r²
и sm5 на всех 3 сидах; MAE справочно.
Запуск: uvx --with-requirements requirements.txt python experiments/lab15_single_model.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from lab13_quantile_router import SEEDS, fit_components, smooth5  # noqa: E402
from lab14_prob_blend import to_mm, z  # noqa: E402
from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin.train import (CASES, PARAM_GRID, make_model, pearson_r2,  # noqa: E402
                            survival_labels)

BLEND_W = 1.0  # lab14: оптимум сетки 0.25-2.0


def split_case(ds: pd.DataFrame, case: str):
    cfg = CASES[case]
    feats = F.case_features(ds, case)
    sub = ds[ds["kind"].isin(cfg["train_kinds"])]
    tr = sub[sub["split"] == "train"]
    va = (ds[ds["split"] == cfg["val_split"]]
          .sort_values(["id", "end", "segment_id"]))
    return feats, tr, va


def fit_single(fam: str, tr, va, feats, params: dict, seed: int) -> np.ndarray:
    C.SEED = seed
    m = make_model(fam, dict(params))
    m.fit(tr[feats], tr["y"])
    return m.predict(va[feats])


def fit_grid(fam: str, tr, va, feats, seed: int) -> np.ndarray:
    """Среднее одной семьи по сетке PARAM_GRID — настройка без Optuna."""
    return np.mean([fit_single(fam, tr, va, feats, p[fam], seed)
                    for p in PARAM_GRID], axis=0)


def fit_hurdle(tr, va, feats, p: np.ndarray, params: dict, seed: int) -> np.ndarray:
    C.SEED = seed
    deep = make_model("catboost", dict(params))
    deep.fit(tr[tr["had_defect"]][feats], tr[tr["had_defect"]]["y"])
    shelf = make_model("catboost", dict(params))
    shelf.fit(tr[~tr["had_defect"]][feats], tr[~tr["had_defect"]]["y"])
    return p * deep.predict(va[feats]) + (1 - p) * shelf.predict(va[feats])


def main() -> None:
    ds, _ = F.build_all(extended=True)
    ds = survival_labels(ds)  # aft_lb/ub для fit_components(full=True)

    for case in ("case1", "case2"):
        feats, tr, va = split_case(ds, case)

        scores: dict[str, list[dict]] = {}
        for seed in SEEDS:
            va_s, ens, _, _, p, auc = fit_components(ds, case, seed, full=True)
            y = va_s["y"].values
            cb_g = fit_grid("catboost", tr, va_s, feats, seed)
            variants = {
                "ref": ens,
                "cb": fit_single("catboost", tr, va_s, feats, {}, seed),
                "cb_grid": cb_g,
                "lgb": fit_single("lgbm", tr, va_s, feats, {}, seed),
                "lgb_grid": fit_grid("lgbm", tr, va_s, feats, seed),
            }
            if case == "case1":
                variants["hurdle"] = fit_hurdle(tr, va_s, feats, p, {}, seed)
                variants["cb_blend"] = to_mm(z(cb_g) + BLEND_W * z(-p), cb_g)
                variants["ens_blend"] = to_mm(z(ens) + BLEND_W * z(-p), ens)
            print(f"{case} seed {seed}: AUC {auc:.3f}", flush=True)
            for name, pred in variants.items():
                scores.setdefault(name, []).append(
                    {"r2": pearson_r2(y, pred),
                     "sm5": pearson_r2(y, smooth5(va_s, pred)),
                     "mae": float(np.mean(np.abs(y - pred)))})

        rows, ref = [], scores["ref"]
        for name, res in scores.items():
            r = {"variant": name}
            for k in ("r2", "sm5", "mae"):
                v = np.array([x[k] for x in res])
                r[f"{k}_mean"] = round(v.mean(), 4)
                r[f"{k}_seeds"] = " ".join(f"{x:.3f}" for x in v)
            r["pass"] = "+" if name != "ref" and all(
                res[i]["r2"] > ref[i]["r2"] and res[i]["sm5"] > ref[i]["sm5"]
                for i in range(len(SEEDS))) else ""
            rows.append(r)
        print(pd.DataFrame(rows).to_string(index=False), flush=True)
    C.SEED = 42


if __name__ == "__main__":
    main()
