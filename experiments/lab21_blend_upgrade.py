"""Лаборатория, серия 21: апгрейд бленда кейса 1 после выравнивания (классификатор, AFT, база).

Гипотезы на выровненных данных (все метрики — боевой бленд, 3 сида 42/7/2024,
финалисты на 8 сидах; база lab20: ref 0.5122):
  A. 300 деревьев: без компенсации -0.12 (отказ); с lr 0.1 паритет; в связке с
     AFT sigma 3 быстрый темп даёт +0.007 — принят. Кейс 2 на 300 теряет 0.01 при
     любом lr — остаётся 600/сетка.
  B. Признаки чистого пролёта (prev_dist_to_def, prev_clean_len из rationale §6):
     1/3 сидов — отказ (дублируют классификатор).
  C. Классификатор: ансамбль CatBoost+LGBM+XGB усреднением вероятностей (avg3)
     +0.059 (3/3), сильнее одиночного CatBoost 1000x8 (+0.035); ранговое
     усреднение рушит амплитуду z-шкалы (0.29) — отказ.
  D. AFT: logistic sigma 2.0 лучший одиночный (+0.045, 3/3); normal пик на
     sigma 3-4; extreme — отказ; НО в связке с базой 300/lr0.1 верх берёт
     normal sigma 3.0.
  E. Чистка признаков по LGBM-важностям: -0.055 (XGB/AFT/классификатор
     пользуются «нулевыми») — отказ. max_depth=30: шум на XGB/AFT,
     CatBoost d16 -0.09 — отказ.
Победитель (подтверждён 8/8 сидов, прирост +0.14 к среднему, худший сид
0.3128 -> 0.6135): база LGBM+XGB+AFT 300 деревьев / lr 0.1, AFT normal sigma 3.0,
классификатор avg3; сидовая хрупкость ушла (разброс 8 сидов 0.008).
Запуск: uvx --with-requirements requirements.txt python experiments/lab21_blend_upgrade.py
(один процесс, лучше пинить: taskset -c 0-7 env OMP_NUM_THREADS=8)
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost
from catboost import CatBoostClassifier
from lightgbm import LGBMClassifier
from xgboost import XGBClassifier

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import train as T  # noqa: E402

_mm = T.make_model
KNOBS = {"n": 600, "lr": 0.05}


def mm(family, params=None, alpha=0.5):
    params = dict(params or {})
    params.setdefault("iterations" if family == "catboost" else "n_estimators", KNOBS["n"])
    params.setdefault("learning_rate", KNOBS["lr"])
    return _mm(family, params, alpha)


def aft_f(X, lb, ub, dist, sigma):
    d = xgboost.DMatrix(X)
    d.set_float_info("label_lower_bound", lb)
    d.set_float_info("label_upper_bound", ub)
    return xgboost.train(dict(objective="survival:aft", aft_loss_distribution=dist,
                              aft_loss_distribution_scale=sigma, tree_method="hist",
                              learning_rate=KNOBS["lr"], max_depth=6, seed=C.SEED),
                         d, num_boost_round=KNOBS["n"])


T.make_model, T.fit_aft = mm, aft_f


def clf_single(X, y, Xv, seed):
    m = CatBoostClassifier(iterations=600, learning_rate=0.05, depth=6,
                           random_seed=seed, verbose=0)
    m.fit(X, y.astype(int))
    return m.predict_proba(Xv)[:, 1]


def clf_avg3(X, y, Xv, seed):
    y = y.astype(int)
    ms = [CatBoostClassifier(iterations=600, learning_rate=0.05, depth=6,
                             random_seed=seed, verbose=0),
          LGBMClassifier(n_estimators=600, learning_rate=0.05, num_leaves=31,
                         random_state=seed, verbosity=-1),
          XGBClassifier(n_estimators=600, learning_rate=0.05, max_depth=6,
                        random_state=seed, verbosity=0)]
    ps = []
    for m in ms:
        m.fit(X, y)
        ps.append(m.predict_proba(Xv)[:, 1])
    return np.mean(ps, axis=0)


# имя: (n, lr, aft, clf)
VARIANTS = {
    "ref_lab20": (600, 0.05, dict(dist="normal", sigma=2.0), clf_single),
    "avg3": (600, 0.05, dict(dist="normal", sigma=2.0), clf_avg3),
    "avg3_lg20": (600, 0.05, dict(dist="logistic", sigma=2.0), clf_avg3),
    "avg3_s3": (600, 0.05, dict(dist="normal", sigma=3.0), clf_avg3),
    "avg3_s3_t300 (принят)": (300, 0.10, dict(dist="normal", sigma=3.0), clf_avg3),
}
SEEDS = (42, 7, 2024, 1, 2, 3, 123, 777)


def main() -> None:
    ds = pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv", parse_dates=["start", "end"])
    ds = T.survival_labels(ds)
    cfg = T.CASES["case1"]
    feats = F.case_features(ds, "case1")
    sub = ds[ds["kind"].isin(cfg["train_kinds"])]
    tr, va = sub[sub["split"] == "train"], ds[ds["split"] == cfg["val_split"]]
    X_tr, y_tr, y_va = tr[feats], tr["y"], va["y"].values

    rows = []
    for name, (n, lr, aft_cfg, clf) in VARIANTS.items():
        KNOBS["n"], KNOBS["lr"] = n, lr
        q05 = np.mean([m.predict(va[feats]) for m in T.fit_q05_pair(X_tr, y_tr)], axis=0)
        C.SEED = 42
        bag = T.fit_bag(X_tr, y_tr, tr["aft_lb"].values, tr["aft_ub"].values,
                        {}, aft_cfg, families=cfg["families"])
        ens = T.predict_bag(bag, va[feats], va["wt_nom"].values)["ensemble"]
        for seed in SEEDS:
            C.SEED = seed
            p = clf(X_tr, tr["had_defect"], va[feats], seed)
            pred = T.blend_prob(ens, p, cfg["blend_w"], gap=ens - q05,
                                gap_w=cfg.get("gap_w", 0.0))
            rows.append(dict(variant=name, seed=seed, r2=T.pearson_r2(y_va, pred)))
            print(name, seed, "готово", flush=True)
    C.SEED = 42

    df = pd.DataFrame(rows)
    piv = df.pivot_table(index="variant", columns="seed", values="r2").round(4)
    piv["mean"] = piv.mean(axis=1).round(4)
    piv["min"] = piv.min(axis=1).round(4)
    print(piv.sort_values("mean", ascending=False).to_string())


if __name__ == "__main__":
    main()
