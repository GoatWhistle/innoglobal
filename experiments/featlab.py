"""Общий стенд серий lab55-59 (признаки): сборка датасета с доп. признаками и боевая оценка.

build(extra_state=None, extra_geom=None, tag=...) — пересобирает train-датасет тем же путём,
что features.build_all (выравнивание profile), добавляя колонки:
  extra_state(sub, n, wt_nom, ctx) -> DataFrame[segment_id, ...] — по дефектам прошлого
      пропуска (sub уже в координатах профиля; для comm2vtd sub=None);
  extra_geom(geom) -> DataFrame[id, segment_id, ...] — статичные признаки трассы.
Результат кэшируется в data/processed/lab/<tag>.parquet (не в git).

eval_case1(ds, feats, seeds) — путь валидации train.run для кейса 1: база LGBM+XGB+AFT
(детерминирована, учится один раз), q05-пара, классификатор avg3 по сиду, бленд bw/gw.
eval_case2(ds, feats) — LGBM по сетке PARAM_GRID (детерминирован).
"""
import os
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import align  # noqa: E402
from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import prepare  # noqa: E402
from pipetwin import train as T  # noqa: E402

CACHE = C.PROCESSED_DIR / "lab"
SEEDS3 = (42, 7, 2024)
SEEDS8 = (42, 7, 2024, 1, 2, 3, 123, 777)
_orig_state = F.start_state_features


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def build(extra_state=None, extra_geom=None, tag: str = "ref", force: bool = False) -> pd.DataFrame:
    path = CACHE / f"{tag}.pkl"
    if path.exists() and not force:
        return pd.read_pickle(path)
    passport = prepare.load_passport()
    altitudes = prepare.load_altitudes()
    nseg = prepare.n_segments(altitudes)
    vtd = prepare.load_vtd()
    runs = prepare.build_runs(vtd)
    geom = F.geometry_features(altitudes, nseg)
    ctx = dict(vtd=vtd, runs=runs, nseg=nseg, passport=passport, altitudes=altitudes)

    def state(vtd_s, runs_, nseg_, passport_, pipe_id, start, kind, age):
        df = _orig_state(vtd_s, runs_, nseg_, passport_, pipe_id, start, kind, age)
        if extra_state is not None:
            n = int(nseg_.loc[pipe_id])
            wt = passport_.set_index("id").loc[pipe_id, "wt_nom"]
            sub = None
            if kind == "vtd2vtd":
                sub = vtd_s[(vtd_s["id"] == pipe_id) & (vtd_s["run_date"] == start)]
            ex = extra_state(sub, n, wt, dict(ctx, pipe_id=pipe_id, start=pd.Timestamp(start),
                                               kind=kind))
            df = df.merge(ex, on="segment_id", how="left")
        return df

    F.start_state_features = state
    try:
        g = geom if extra_geom is None else geom.merge(extra_geom(geom), on=["id", "segment_id"])
        ctx2 = dict(vtd=vtd, runs=runs, nseg=nseg, passport=passport, altitudes=altitudes,
                    regime=F.load_regime(), geom=g, grav=F.gravimetry_by_pipe(), uzt=F.load_uzt())
        ds = F.build_rows(prepare.build_pairs(runs, passport, extended=True), with_target=True,
                          **ctx2)
        ds = F.assign_split(ds)
    finally:
        F.start_state_features = _orig_state
    CACHE.mkdir(parents=True, exist_ok=True)
    ds.to_pickle(path)
    return ds


_REF_COLS = None


def base_feats(ds: pd.DataFrame, case: str) -> list[str]:
    """Признаки боевого конфига кейса (без новых колонок лаборатории)."""
    global _REF_COLS
    if _REF_COLS is None:
        _REF_COLS = set(pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv", nrows=1).columns)
    return [c for c in F.case_features(ds, case) if c in _REF_COLS]


def load_ref() -> pd.DataFrame:
    return pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv", parse_dates=["start", "end"])


def _split(ds, case):
    cfg = T.CASES[case]
    ds = T.survival_labels(ds)
    sub = ds[ds["kind"].isin(cfg["train_kinds"])]
    return cfg, sub[sub["split"] == "train"], ds[ds["split"] == cfg["val_split"]]


def eval_case1(ds: pd.DataFrame, feats: list[str], seeds=SEEDS3, ret_pred=False):
    """Боевой бленд кейса 1 -> {seed: (r2, mae)} (+ прогнозы)."""
    cfg, tr, va = _split(ds, "case1")
    X_tr, y_tr, X_va, y_va = tr[feats], tr["y"], va[feats], va["y"].values
    C.SEED = 42
    bag = T.fit_bag(X_tr, y_tr, tr["aft_lb"].values, tr["aft_ub"].values,
                    cfg["params"], cfg["aft"], seeds=(42,), families=cfg["families"])
    ens = T.predict_bag(bag, X_va, va["wt_nom"].values)["ensemble"]
    q05 = np.mean([m.predict(X_va) for m in T.fit_q05_pair(X_tr, y_tr, cfg["params"])], axis=0)
    out, preds = {}, {}
    for s in seeds:
        C.SEED = s
        p = T.fit_clf(X_tr, tr["had_defect"]).predict_proba(X_va)[:, 1]
        pred = T.blend_prob(ens, p, cfg["blend_w"], gap=ens - q05, gap_w=cfg["gap_w"])
        out[s] = (T.pearson_r2(y_va, pred), float(np.mean(np.abs(y_va - pred))))
        preds[s] = pred
    C.SEED = 42
    out["ens_raw"] = (T.pearson_r2(y_va, ens), float(np.mean(np.abs(y_va - ens))))
    return (out, preds) if ret_pred else out


def eval_case2(ds: pd.DataFrame, feats: list[str]):
    cfg, tr, va = _split(ds, "case2")
    X_tr, y_tr, y_va = tr[feats], tr["y"], va["y"].values
    bag = [m for p in cfg["param_grid"] for m in T.fit_bag(
        X_tr, y_tr, None, None, p, None, seeds=(42,), families=cfg["families"])]
    pred = T.predict_bag(bag, va[feats], va["wt_nom"].values)["ensemble"]
    return T.pearson_r2(y_va, pred), float(np.mean(np.abs(y_va - pred)))


def fmt(res: dict) -> str:
    s = [k for k in res if k != "ens_raw"]
    r = [res[k][0] for k in s]
    return (" ".join(f"{k}:{res[k][0]:.4f}" for k in s)
            + f" | mean {np.mean(r):.4f} min {np.min(r):.4f} mae {np.mean([res[k][1] for k in s]):.3f}"
            + (f" | raw {res['ens_raw'][0]:.4f}" if "ens_raw" in res else ""))


def threads():
    return int(os.environ.get("OMP_NUM_THREADS", "8"))
