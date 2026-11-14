"""Лаборатория 60-62: шумный таргет и обучающие пары кейса 1.

Харнесс: для варианта (таргет обучения, веса образцов, отбор пар, трогать ли
классификатор) обучает базу LGBM+XGB(q0.5)+AFT и q05-пару на train, классификатор
avg3 — либо из кэша lab40 (неизменный), либо переобученный с теми же весами/отбором;
бленд -> калибровка (train.calibrate_mm) -> клип по номиналу. Оценка всегда по
реальному минимуму сегмента y на валидации 2022->2023 (55 сегм.), сиды 42/7/2024.
Запуск: LAB60_SET=target|weights|pairs|shrink|jitter python experiments/lab60_denoise.py
r2d — r² только по 53 дефектным сегментам; MAE — прод-путь (калибровка + клип).

ИТОГ (ref: r² 0.618, r2d 0.228, MAE 0.254; 3 сида клф):
!!! ЧЕСТНАЯ ВАЛИДАЦИЯ (LAB_PROC=logs/proc_honest, LAB60_CAL=0; ref r² 0.225 / r2d 0.063 / MAE 0.336):
  shrink 0.5/5 lvlref 0.209 / 0.039 / 0.339 — ОТКАЧЕНО (shrink=None); сетка shrink рваная
  (λ0.5/w3 0.242/0.064, λ0.75/w3 0.236/0.065 — по r2d в пределах шума); q10/q25/q10nb3 0.17/0.16/0.19
  (r2d ≤ 0.03); nb3 0.249/0.056; multi y+nb3 0.246/0.066 (MAE 0.343 хуже).
  Веса на honest: все хуже по r2d (vtd2vtd ×0.25/×0.5/×2 0.19-0.20, свежесть τ5 0.222/0.053
  (MAE 0.334, 3/3, но r2d хуже), τ10 0.209, 6 мм ×0.5 0.206, ndef 0.202).
  Отбор пар на honest: без vtd2vtd 0.155 (MAE 0.92), без ->2018 0.245 но r2d 0.054 (хуже),
  только 8 мм 0.197. Ничего не принято.
(ниже — итог на старой, утёкшей валидации; не действителен)
ПРИНЯТО (на утёкшей) — shrink-таргет для базы формы: y_shape = 0.5·y + 0.5·медиана y по 5 сегментам
  пары; база формы (LGBM+XGB+AFT, q05-пара) учится на y_shape, уровень мм — от базы на y
  («lvlref»). 8 сидов: r² 0.617 -> 0.646, r2d 0.227 -> 0.293, MAE 0.255 -> 0.247,
  RMSE 0.350 -> 0.333, MAPE 4.51 -> 4.36, 8/8 по всем. Парный джиттер базы (5 подвыборок
  97% × 3 сида, т.к. сиды меняют только классификатор): r² 0.602 -> 0.618 (sd 0.008),
  r2d 0.200 -> 0.229, MAE 0.266 -> 0.256 — 15/15 по всем трём.
  Оговорка: сетка λ×окно рваная (λ0.25/w5 +0.009, w3/w9 ~ref, λ≥0.75 хуже ref на 0.05+),
  λ0.5/w5 — пик на 55 сегментах; джиттер показывает, что пик не дрожь деревьев, но
  отбор из 12 точек по валидации всё равно есть.
ОТВЕРГНУТО:
  - таргет q10 / q25 / q10 ±1: r2d 0.10 / 0.16 / 0.10, MAE 0.43-0.68;
  - среднее ±1 (nb3): r² 0.611, r2d 0.215; multi y+q10: 0.611 / 0.215, MAE 0.314;
  - multi y+shrink0.5: r² 0.643, r2d 0.282, но MAE 7/8 и хуже lvlref-варианта;
  - отбор пар: без vtd2vtd 0.580/0.170 (MAE 0.705!), без пар ->2018 0.561/0.126,
    только 8 мм 0.571/0.149 (+clf — ещё хуже);
  - веса: vtd2vtd ×0.5 0.602/0.199, ×2 0.528/0.086, ×0.25 0.628/0.247 (немонотонно — шум),
    свежесть τ5/τ10 0.588/0.602, 6 мм ×0.5 0.605, sqrt доли дефектных 0.588; +clf хуже.
"""
import os
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import xgboost

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from pipetwin import config as C  # noqa: E402
if os.environ.get("LAB_PROC"):  # честный датасет lab62
    C.PROCESSED_DIR = Path(__file__).resolve().parents[1] / os.environ["LAB_PROC"]
from pipetwin import features as F  # noqa: E402
from pipetwin import train as T  # noqa: E402

CACHE = joblib.load(os.environ.get("LAB40_CACHE", Path(__file__).resolve().parent / "data" / "lab40_cache.joblib"))["val"]
SEEDS = tuple(int(s) for s in os.environ.get("LAB60_SEEDS", "42,7,2024").split(","))
CFG = T.CASES["case1"]
GRP = ["id", "start", "end"]


def nb3(ds, col):
    return (ds.sort_values(GRP + ["segment_id"]).groupby(GRP)[col]
            .transform(lambda s: s.rolling(3, center=True, min_periods=1).mean())
            .reindex(ds.index))


def nbmed5(ds, col, w=5):
    return (ds.sort_values(GRP + ["segment_id"]).groupby(GRP)[col]
            .transform(lambda s: s.rolling(w, center=True, min_periods=1).median())
            .reindex(ds.index))


def targets(ds):
    t = {"y": ds["y"], "q10": ds["y_q10"], "q25": ds["y_q25"], "nb3": nb3(ds, "y"),
         "q10nb3": nb3(ds, "y_q10")}
    t["shrink50"] = 0.5 * ds["y"] + 0.5 * nbmed5(ds, "y")
    t["shrink25"] = 0.75 * ds["y"] + 0.25 * nbmed5(ds, "y")
    for lam in (0.25, 0.5, 0.75, 1.0):
        for w in (3, 5, 9):
            t[f"sh{lam}_w{w}"] = (1 - lam) * ds["y"] + lam * nbmed5(ds, "y", w)
    return t


AGG = {"v": None}  # агрегат членов базы для варианта: None/"mean" | "median"


def fit_ens(tr, Xv, wt_v, target, w):
    """База кейса 1 (как fit_bag/predict_bag для детерминированных членов) + q05."""
    X, prm = tr[CFG_FEATS], CFG["params"]
    preds = []
    for f in CFG["families"]:
        m = T.make_model(f, dict(prm[f]))
        m.fit(X, target, sample_weight=w)
        preds.append(m.predict(Xv))
    lab = T.survival_labels(tr.assign(y=target))
    d = xgboost.DMatrix(X, weight=w)
    d.set_float_info("label_lower_bound", lab["aft_lb"].values)
    d.set_float_info("label_upper_bound", lab["aft_ub"].values)
    a = CFG["aft"]
    bst = xgboost.train(dict(objective="survival:aft", aft_loss_distribution=a["dist"],
                             aft_loss_distribution_scale=a["sigma"], tree_method="hist",
                             learning_rate=a["lr"], max_depth=6, seed=C.SEED),
                        d, num_boost_round=a["rounds"])
    preds.append(wt_v - bst.predict(xgboost.DMatrix(Xv)))
    q05 = []
    for f in ("lgbm", "xgb"):
        m = T.make_model(f, dict(prm[f]), alpha=0.05)
        m.fit(X, target, sample_weight=w)
        q05.append(m.predict(Xv))
    agg = np.median if (AGG["v"] or os.environ.get("LAB60_AGG")) == "median" else np.mean
    return agg(preds, axis=0), np.mean(q05, axis=0)


def fit_clf(tr, Xv, w, seed):
    from catboost import CatBoostClassifier
    from lightgbm import LGBMClassifier
    from xgboost import XGBClassifier
    y = tr["had_defect"].astype(int)
    ms = [CatBoostClassifier(iterations=600, learning_rate=0.05, depth=6,
                             random_seed=seed, verbose=0, thread_count=8),
          LGBMClassifier(n_estimators=600, learning_rate=0.05, num_leaves=31,
                         random_state=seed, verbosity=-1, n_jobs=8),
          XGBClassifier(n_estimators=600, learning_rate=0.05, max_depth=6,
                        random_state=seed, verbosity=0, n_jobs=8)]
    return np.mean([m.fit(tr[CFG_FEATS], y, sample_weight=w).predict_proba(Xv)[:, 1]
                    for m in ms], axis=0)


def evaluate(y, ens, q05, p, pm, wt, hd, lvl=None):
    b = T.blend_prob(ens, p, CFG["blend_w"], gap=ens - q05, gap_w=CFG["gap_w"])
    base = ens if lvl is None else lvl
    if os.environ.get("LAB60_CAL", "1") == "1":
        cal = T.calibrate_mm(b, base, pm)
    else:  # без калибровки lab41: уровень/разброс — среднее/std базы уровня
        cal = T.zscore(b) * float(np.std(base)) + float(np.mean(base))
    phys = np.clip(cal, 0.5, wt)
    return dict(r2=T.pearson_r2(y, cal), r2_phys=T.pearson_r2(y, phys),
                r2d=T.pearson_r2(y[hd], phys[hd]),  # без бездефектных сегментов
                mae_d=float(np.mean(np.abs(y[hd] - phys[hd]))),
                mae=float(np.mean(np.abs(y - phys))),
                rmse=float(np.sqrt(np.mean((y - phys) ** 2))),
                mape=float(np.mean(np.abs(y - phys) / y) * 100))


def w_none(tr):
    return np.ones(len(tr))


def w_kind(f):
    return lambda tr: np.where(tr["kind"] == "vtd2vtd", f, 1.0)


def w_recency(tau):
    return lambda tr: np.exp((tr["end"].dt.year.values - 2023) / tau)


def w_8mm(f):
    return lambda tr: np.where(tr["wt_nom"] == 8.0, 1.0, f)


def w_ndef():
    # пары, где целевой пропуск видит больше дефектов на сегмент (чувствительный
    # снаряд), информативнее: вес ∝ sqrt(доли дефектных сегментов пары)
    def f(tr):
        frac = tr.groupby(GRP)["had_defect"].transform("mean").values
        return np.sqrt(np.clip(frac, 0.05, 1.0))
    return f


# имя: (таргет, весовая функция, фильтр строк train, переобучать классификатор)
SETS = {
    "target": {
        "ref": ("y", w_none, None, False),
        "q10": ("q10", w_none, None, False),
        "q25": ("q25", w_none, None, False),
        "nb3": ("nb3", w_none, None, False),
        "q10nb3": ("q10nb3", w_none, None, False),
        "shrink25": ("shrink25", w_none, None, False),
        "shrink50": ("shrink50", w_none, None, False),
        "multi_y+q10": (("y", "q10"), w_none, None, False),
        "multi_y+nb3": (("y", "nb3"), w_none, None, False),
    },
    "weights": {
        "ref": ("y", w_none, None, False),
        "vtd2vtd×0.5": ("y", w_kind(0.5), None, False),
        "vtd2vtd×0.25": ("y", w_kind(0.25), None, False),
        "vtd2vtd×2": ("y", w_kind(2.0), None, False),
        "recency τ5": ("y", w_recency(5.0), None, False),
        "recency τ10": ("y", w_recency(10.0), None, False),
        "6mm×0.5": ("y", w_8mm(0.5), None, False),
        "ndef sqrt": ("y", w_ndef(), None, False),
        "vtd2vtd×0.5 +clf": ("y", w_kind(0.5), None, True),
        "recency τ5 +clf": ("y", w_recency(5.0), None, True),
    },
    "shrink": {
        "ref": ("y", w_none, None, False),
        **{f"sh{lam}_w{w}": (f"sh{lam}_w{w}", w_none, None, False)
           for lam in (0.25, 0.5, 0.75, 1.0) for w in (3, 5, 9)},
        **{f"sh{lam}_w5 lvlref": (f"sh{lam}_w5", w_none, None, False, True)
           for lam in (0.5, 0.75, 1.0)},
        "multi_y+sh0.5_w5": (("y", "sh0.5_w5"), w_none, None, False),
        **{f"sh{lam}_w{w} lvlref": (f"sh{lam}_w{w}", w_none, None, False, True)
           for lam in (0.25, 0.5) for w in (3, 9)},
        "sh0.25_w5 lvlref": ("sh0.25_w5", w_none, None, False, True),
    },
    # парный джиттер базы: те же варианты на 5 случайных подвыборках 97% train
    # (база детерминирована, сиды меняют только классификатор — 3/3 сидов не
    # отличает выигрыш от дрожи деревьев на 55 сегментах)
    "jitter": {
        f"{v} j{j}": (t, w_none, ("jit", j), False, lv)
        for j in range(5)
        for v, t, lv in (("ref", "y", False), ("sh0.25_w5", "sh0.25_w5", False),
                         ("sh0.5_w5 lvlref", "sh0.5_w5", True),
                         ("multi_y+sh0.5_w5", ("y", "sh0.5_w5"), False),
                         ("sh0.5_w3", "sh0.5_w3", False))
    },
    # lab63: медиана членов (LGBM, XGB, AFT) вместо среднего — уровень/форма под MAE
    "aggjit": {
        f"{v} j{j}": ("y", w_none, ("jit", j), False, False, a)
        for j in range(5) for v, a in (("ref", "mean"), ("median", "median"))
    },
    "pairs": {
        "ref": ("y", w_none, None, False),
        "no vtd2vtd": ("y", w_none, lambda t: t["kind"] != "vtd2vtd", False),
        "no end2018": ("y", w_none, lambda t: t["end"].dt.year != 2018, False),
        "only 8mm": ("y", w_none, lambda t: t["wt_nom"] == 8.0, False),
        "no 6mm comm2vtd": ("y", w_none,
                            lambda t: ~((t["wt_nom"] != 8.0) & (t["kind"] == "comm2vtd")), False),
        "no vtd2vtd +clf": ("y", w_none, lambda t: t["kind"] != "vtd2vtd", True),
        "no end2018 +clf": ("y", w_none, lambda t: t["end"].dt.year != 2018, True),
    },
}
CFG_FEATS: list = []


def main():
    global CFG_FEATS
    ds = pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv", parse_dates=["start", "end"])
    CFG_FEATS = F.case_features(ds, "case1")
    sub = ds[ds["kind"].isin(CFG["train_kinds"])]
    tgt = targets(sub)
    tr_all = sub[sub["split"] == "train"]
    va = ds[ds["split"] == CFG["val_split"]]
    assert np.allclose(va["y"].values, CACHE["meta"]["y"].values)
    hd = va["had_defect"].values.astype(bool)
    y, pm, wt, Xv = va["y"].values, va["prev_min"].values, va["wt_nom"].values, va[CFG_FEATS]
    print("train pairs:\n", tr_all.groupby(["kind", "wt_nom", tr_all["start"].dt.year,
                                             tr_all["end"].dt.year]).size().to_string(), flush=True)
    rows = []
    ens_ref = fit_ens(tr_all, Xv, wt, tgt["y"].loc[tr_all.index].values, w_none(tr_all))[0]
    for name, (tcol, wf, filt, clf, *opt) in SETS[os.environ.get("LAB60_SET", "target")].items():
        if isinstance(filt, tuple):  # джиттер: подвыборка 97% строк с сидом j
            keep = np.random.default_rng(filt[1]).random(len(tr_all)) < 0.97
            tr = tr_all[keep]
        else:
            tr = tr_all[filt(tr_all)] if filt else tr_all
        w = wf(tr)
        tcols = tcol if isinstance(tcol, tuple) else (tcol,)
        AGG["v"] = opt[1] if len(opt) > 1 else None
        fits = [fit_ens(tr, Xv, wt, tgt[c].loc[tr.index].values, w) for c in tcols]
        ens = np.mean([f[0] for f in fits], axis=0)
        q05 = np.mean([f[1] for f in fits], axis=0)
        for s in SEEDS:
            p = fit_clf(tr, Xv, w, s) if clf else CACHE[f"p_{s}"]
            # lvlref: форма от варианта, уровень мм — от базы на реальном минимуме
            lvl = ens_ref if opt and opt[0] else None
            rows.append(dict(variant=name, seed=s,
                             **evaluate(y, ens, q05, p, pm, wt, hd, lvl)))
        print(name, "готово", flush=True)
    df = pd.DataFrame(rows)
    if os.environ.get("LAB60_SET") in ("jitter", "aggjit"):
        df["jit"] = df.variant.str.extract(r" j(\d)$")[0].astype(int)
        df["variant"] = df.variant.str.replace(r" j\d$", "", regex=True)
        base = df[df.variant == "ref"].set_index(["jit", "seed"])
        for k in ("r2", "r2d", "mae"):
            df[f"d_{k}"] = df[k].values - base.loc[list(zip(df.jit, df.seed)), k].values
        g = df.groupby("variant", sort=False).agg(
            r2=("r2", "mean"), r2_sd=("r2", "std"), r2d=("r2d", "mean"), r2d_sd=("r2d", "std"),
            mae=("mae", "mean"), rmse=("rmse", "mean"), mape=("mape", "mean"),
            r2_wins=("d_r2", lambda x: f"{int((x > 0).sum())}/{len(x)}"),
            r2d_wins=("d_r2d", lambda x: f"{int((x > 0).sum())}/{len(x)}"),
            mae_wins=("d_mae", lambda x: f"{int((x < 0).sum())}/{len(x)}"))
        print(g.round(4).to_string(), flush=True)
        return
    ref = df[df.variant == "ref"].set_index("seed")
    for k in ("r2", "r2d", "mae"):
        df[f"d_{k}"] = df[k].values - ref.loc[df.seed, k].values
    g = df.groupby("variant", sort=False).agg(
        r2=("r2", "mean"), r2_phys=("r2_phys", "mean"), r2d=("r2d", "mean"),
        mae=("mae", "mean"), mae_d=("mae_d", "mean"),
        rmse=("rmse", "mean"), mape=("mape", "mean"),
        r2_wins=("d_r2", lambda x: int((x > 0).sum())),
        r2d_wins=("d_r2d", lambda x: int((x > 0).sum())),
        mae_wins=("d_mae", lambda x: int((x < 0).sum())))
    print(g.round(4).to_string(), flush=True)


if __name__ == "__main__":
    main()
