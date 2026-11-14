"""Лаборатория, серия 59: (4) target encoding по соседям с OOF-защитой + лаги по дистанции;
(5) отбор признаков permutation importance на внутреннем CV (кейс 1).

LAB59_MODE=te     — лаги prev_min/наличия дефекта ±1/±2 сегмента; OOF target encoding
                    вероятности дефекта и потери металла по ячейкам (дефект в прошлом пропуске ×
                    квартиль кармана × квартиль низинности), фолды = целевой пропуск (id, end).
LAB59_MODE=select — внутренний CV по целевым пропускам vtd2vtd train (9490/11604/22871
                    2018->2022; из обучения выкинуты все строки с тем же (id, end)), боевой
                    бленд, permutation importance на отложенной части (Δ pooled r² и r2d),
                    затем валидация наборов без признаков с Δ<=0.
ИТОГ:
  (4) lags (prev_min и наличие дефекта ±1/±2) одни: 8/8 сидов mean 0.6378 r2d 0.280, но MAE
      0.290 (хуже ref 0.279); нуль max 0.633/0.260; поверх принятого quant не добавляют:
      q+lag_min 0.632, q+lag_def 0.633, quant+lags 0.625 (quant 0.6336) — отказ (quant лучше по MAE
      и нулю, вместе хуже). OOF target encoding по ячейкам (дефект × карман × низина): 0.503,
      quant+te 0.548 — отказ.
  (5) внутренний CV по целевым пропускам train: r² бленда на отложенных фолдах 0.04/0.02/0.002
      (9490/11604/22871) — сигнала нет, permutation importance = шум. Наборы по нему:
      keep>0 6/40 признаков -> 0.038; drop worst25% -> 0.036; ref+quant keep>0 8/44 -> 0.24 — отказ.
"""
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import featlab as L  # noqa: E402
import lab55_defect_stats as A  # noqa: E402
from pipetwin import config as C  # noqa: E402
from pipetwin import train as T  # noqa: E402


# ------------------------------------------------------------------ (4) TE + лаги
def add_lags(ds):
    ds = ds.sort_values(["id", "start", "end", "segment_id"]).copy()
    g = ds.groupby(["id", "start", "end"])
    hd = (ds["prev_ndef"] > 0).astype(float)
    for k in (1, 2):
        ds[f"lag_min_m{k}"] = g["prev_min"].shift(k).fillna(ds["prev_min"])
        ds[f"lag_min_p{k}"] = g["prev_min"].shift(-k).fillna(ds["prev_min"])
        ds[f"lag_def_m{k}"] = hd.groupby([ds["id"], ds["start"], ds["end"]]).shift(k).fillna(0)
        ds[f"lag_def_p{k}"] = hd.groupby([ds["id"], ds["start"], ds["end"]]).shift(-k).fillna(0)
    return ds.sort_index()


def add_te(ds, smooth=20.0):
    ds = ds.copy()
    cell = ((ds["prev_ndef"] > 0).astype(int).astype(str) + "_"
            + pd.qcut(ds["pocket_depth"].rank(method="first"), 4, labels=False).astype(str) + "_"
            + pd.qcut(ds["lowness_250m"].rank(method="first"), 4, labels=False).astype(str))
    ds["_cell"] = cell
    ds["_loss"] = (ds["prev_min"] - ds["y"]).clip(lower=0)
    ds["_grp"] = ds["id"].astype(str) + "_" + ds["end"].astype(str)
    tr = ds["split"] == "train"
    for tgt, col in (("had_defect", "te_def"), ("_loss", "te_loss")):
        prior = ds.loc[tr, tgt].astype(float).mean()
        ds[col] = np.nan
        for grp in ds["_grp"].unique():
            fit = tr & (ds["_grp"] != grp)
            st = ds[fit].groupby("_cell")[tgt].agg(["sum", "count"])
            enc = (st["sum"] + smooth * prior) / (st["count"] + smooth)
            m = ds["_grp"] == grp
            ds.loc[m, col] = ds.loc[m, "_cell"].map(enc).fillna(prior).astype(float)
    return ds.drop(columns=["_cell", "_loss", "_grp"])


def run_te():
    ds = L.build(extra_state=A.seg_stats, tag="lab55")
    for c in A.COLS_NAN:
        ds[c] = ds[c].fillna(0.0)
    ds = add_te(add_lags(ds))
    f1 = L.base_feats(ds, "case1")
    q = A.GROUPS["quant"]
    lags = [f"lag_{a}_{b}{k}" for a in ("min", "def") for b in ("m", "p") for k in (1, 2)]
    L.log("ref", L.fmt(L.eval_case1(ds, f1)))
    L.log("quant", L.fmt(L.eval_case1(ds, f1 + q)))
    for name, extra in {"lags": lags, "te": ["te_def", "te_loss"],
                        "quant+te": q + ["te_def", "te_loss"], "quant+lags": q + lags}.items():
        L.log(name, L.fmt(L.eval_case1(ds, f1 + extra)))


# ------------------------------------------------------------ (5) отбор признаков
def cv_blend(ds, feats, fold_key, seed=42):
    """Фит боевого бленда без целевого пропуска fold_key, возврат (функция прогноза, ho)."""
    cfg = T.CASES["case1"]
    ds = T.survival_labels(ds)
    sub = ds[ds["kind"].isin(cfg["train_kinds"]) & (ds["split"] == "train")]
    key = sub["id"].astype(str) + "_" + sub["end"].astype(str)
    tr = sub[key != fold_key]
    ho = sub[(key == fold_key) & (sub["kind"] == "vtd2vtd")]
    C.SEED = seed
    bag = T.fit_bag(tr[feats], tr["y"], tr["aft_lb"].values, tr["aft_ub"].values,
                    cfg["params"], cfg["aft"], seeds=(seed,), families=cfg["families"])
    q05 = T.fit_q05_pair(tr[feats], tr["y"], cfg["params"])
    clf = T.fit_clf(tr[feats], tr["had_defect"])

    def predict(X):
        ens = T.predict_bag(bag, X, ho["wt_nom"].values)["ensemble"]
        qq = np.mean([m.predict(X) for m in q05], axis=0)
        return T.blend_prob(ens, clf.predict_proba(X)[:, 1], cfg["blend_w"],
                            gap=ens - qq, gap_w=cfg["gap_w"])
    return predict, ho


def run_select():
    ds = L.build(extra_state=A.seg_stats, tag="lab55")
    for c in A.COLS_NAN:
        ds[c] = ds[c].fillna(0.0)
    rng = np.random.default_rng(0)
    for base_name, feats in (("ref", L.base_feats(ds, "case1")),
                             ("ref+quant", L.base_feats(ds, "case1") + A.GROUPS["quant"])):
        folds = (ds[(ds["split"] == "train") & (ds["kind"] == "vtd2vtd")]
                 .pipe(lambda d: d["id"].astype(str) + "_" + d["end"].astype(str)).unique())
        imp = {f: [] for f in feats}
        for fk in folds:
            predict, ho = cv_blend(ds, feats, fk)
            X, y = ho[feats].copy(), ho["y"].values
            base = predict(X)
            r0 = T.pearson_r2(y, base)
            L.log(base_name, "fold", fk, "n", len(ho), "r2", round(r0, 4))
            for f in feats:
                d = []
                for _ in range(3):
                    Xp = X.copy()
                    Xp[f] = rng.permutation(Xp[f].values)
                    d.append(r0 - T.pearson_r2(y, predict(Xp)))
                imp[f].append((np.mean(d), len(ho)))
        # взвешенно по числу сегментов фолда
        score = {f: sum(a * n for a, n in v) / sum(n for _, n in v) for f, v in imp.items()}
        s = pd.Series(score).sort_values()
        print(s.round(5).to_string(), flush=True)
        keep = [f for f in feats if score[f] > 0]
        keep_q = [f for f in feats if score[f] >= s.quantile(0.25)]
        L.log(base_name, "full", L.fmt(L.eval_case1(ds, feats)))
        L.log(base_name, f"keep>0 ({len(keep)}/{len(feats)})", L.fmt(L.eval_case1(ds, keep)))
        L.log(base_name, f"drop worst25% ({len(keep_q)})", L.fmt(L.eval_case1(ds, keep_q)))


if __name__ == "__main__":
    if os.environ.get("LAB59_MODE", "te") != "lags":
        {"te": run_te, "select": run_select}[os.environ.get("LAB59_MODE", "te")]()


def run_lags_check():
    """Лаги поверх quant и отдельно: 8 сидов, нуль-перестановки, self22."""
    ds = L.build(extra_state=A.seg_stats, tag="lab55")
    for c in A.COLS_NAN:
        ds[c] = ds[c].fillna(0.0)
    ds = add_lags(ds)
    f1, q = L.base_feats(ds, "case1"), A.GROUPS["quant"]
    lmin = [f"lag_min_{b}{k}" for b in ("m", "p") for k in (1, 2)]
    ldef = [f"lag_def_{b}{k}" for b in ("m", "p") for k in (1, 2)]
    L.log("lags8", L.fmt(L.eval_case1(ds, f1 + lmin + ldef, seeds=L.SEEDS8)))
    res = L.null_case1(ds, f1, lmin + ldef)
    L.log("lags null", " ".join(f"{r[0]:.4f}/{r[2]:.4f}" for r in res))
    for name, extra in {"q+lag_min": q + lmin, "q+lag_def": q + ldef}.items():
        L.log(name, L.fmt(L.eval_case1(ds, f1 + extra)))


if os.environ.get("LAB59_MODE") == "lags":
    run_lags_check()
