"""Лаборатория, серия 38b (кейс 2): Optuna для LGBM кейса 2 на внутреннем CV.

Цель Optuna — только train: leave-one-pipe-out по трубам пар «ввод→ВТД» train
(валидационная пара 22871 ввод→2018 в train не входит; её пропуск 2022 — входит, как
в официальной V1). Метрика фолда — Пирсон r² трубы; трубы с константным таргетом
пропускаются. Валидация (V1/V2) только для отчёта ПОСЛЕ отбора.
Пространство: num_leaves, learning_rate, n_estimators, min_child_samples,
reg_lambda, feature_fraction, bagging (стохастичные — поэтому 3 сида при оценке).
Сравнение: (a) лучший трайл одиночно, (b) усреднение топ-6 трайлов (аналог сетки
PARAM_GRID), против текущей сетки; всё поверх текущего конвейера кейса 2
(−z, рельефный приор w=0.5, калибровка).

ИТОГ: не завершена (снята координатором после 60 из 80 трайлов, ~65 с/трайл). Внутренний
LOPO-CV по трубам train почти нулевой: члены текущей сетки 0.000-0.004, лучший трайл Optuna
0.0225 — это шум уровня V2/V3 (трубы ЦППН — константный таргет с редкими ямами), подбирать
по нему нечего. Валидационная оценка не проводилась. Сетка PARAM_GRID оставлена.
"""
import os
import sys
import time
from pathlib import Path

import numpy as np
import optuna
import pandas as pd
from lightgbm import LGBMRegressor

sys.path.insert(0, str(Path(__file__).resolve().parent))
import c2lab as L  # noqa: E402
from pipetwin import train as T  # noqa: E402
from pipetwin.prepare import load_passport  # noqa: E402

NJ = int(os.environ.get("NJ", "8"))
N_TRIALS = int(os.environ.get("TRIALS", "80"))


def make(params, seed=42):
    return LGBMRegressor(objective="quantile", alpha=0.5, verbosity=-1, n_jobs=NJ,
                         random_state=seed, **params)


def space(trial):
    p = dict(num_leaves=trial.suggest_int("num_leaves", 7, 255, log=True),
             learning_rate=trial.suggest_float("learning_rate", 0.01, 0.2, log=True),
             n_estimators=trial.suggest_int("n_estimators", 200, 1200, step=100),
             min_child_samples=trial.suggest_int("min_child_samples", 5, 100, log=True),
             reg_lambda=trial.suggest_float("reg_lambda", 1e-3, 30, log=True),
             feature_fraction=trial.suggest_float("feature_fraction", 0.4, 1.0))
    if trial.suggest_categorical("bagging", [False, True]):
        p.update(bagging_fraction=trial.suggest_float("bagging_fraction", 0.5, 0.95),
                 bagging_freq=1)
    return p


def cv_score(params, tr, feats):
    scores = []
    for pid in tr["id"].unique():
        va = tr[tr["id"] == pid]
        if va["y"].std() < 1e-9 or len(va) < 30:
            continue
        fit = tr[tr["id"] != pid]
        p = make(params).fit(fit[feats], fit["y"]).predict(va[feats])
        scores.append(L.r2(va["y"], p))
    return float(np.mean(scores))


def main():
    ds, sub, feats = L.load()
    dir_of = dict(load_passport()[["id", "direction"]].itertuples(index=False))
    tr = sub[sub["split"] == "train"]
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    study = optuna.create_study(direction="maximize",
                                sampler=optuna.samplers.TPESampler(seed=42))
    t = time.time()
    base_grid = [dict(num_leaves=2 ** d - 1, learning_rate=lr, n_estimators=600)
                 for d, lr in ((4, 0.03), (6, 0.05), (8, 0.10), (4, 0.10), (6, 0.03), (8, 0.05))]
    print("CV текущей сетки (по членам):",
          [round(cv_score(p, tr, feats), 4) for p in base_grid], flush=True)

    def cb(st, tri):
        if tri.number % 10 == 0:
            print(f"trial {tri.number} best {st.best_value:.4f} ({time.time() - t:.0f}s)",
                  flush=True)
    study.optimize(lambda tri: cv_score(space(tri), tr, feats), n_trials=N_TRIALS,
                   callbacks=[cb])
    top = sorted([x for x in study.trials if x.value is not None],
                 key=lambda x: -x.value)[:6]

    def to_params(tri):
        p = dict(tri.params)
        if p.pop("bagging"):
            p["bagging_freq"] = 1
        else:
            p.pop("bagging_fraction", None)
        return p
    print("лучший:", round(top[0].value, 4), to_params(top[0]), flush=True)

    variants = {"grid (тек.)": base_grid, "optuna best": [to_params(top[0])],
                "optuna top6": [to_params(x) for x in top]}
    rows = []
    for name, plist in variants.items():
        for seed in (42, 7, 2024):
            for sp, pairs in L.splits(ds, sub).items():
                if sp == "V3":
                    continue
                trn, va = pairs[0]
                ens = np.mean([make(p, seed).fit(trn[feats], trn["y"]).predict(va[feats])
                               for p in plist], axis=0)
                out = T._case2_shape(ens, trn, va, T.CASES["case2"], dir_of)
                fin = out["ens_prior_cal"]
                rows.append(dict(variant=name, seed=seed, split=sp,
                                 raw=L.r2(va["y"], ens), r2=L.r2(va["y"], fin),
                                 mae=L.mae(va["y"], fin)))
            print(name, seed, "готово", flush=True)
    df = pd.DataFrame(rows)
    print(df.pivot_table(index=["variant", "seed"], columns="split",
                         values=["raw", "r2", "mae"]).round(4).to_string())


if __name__ == "__main__":
    main()
