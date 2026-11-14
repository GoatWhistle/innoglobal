"""Лаборатория, серия 12: пространственная интерполяция техрежима.

Гипотеза: core.regime_daily даёт граничные значения по трубе (p_start/p_end,
t_start/t_end); сейчас в модели только стартовые как константы. Линейная
интерполяция вдоль дистанции даст сегментам пространственную вариацию:
  t_at = t_start + dist_frac·(t_end − t_start), аналогично p_at;
плюс градиенты на трубу: t_grad = (t_end − t_start) / длина (константа).

Референс — case_features минус новые признаки. Ансамбль 3 бустингов (как lab8),
3 сида — оценка шума. Подтверждение (--confirm [группы]) — с AFT, как train.run.
Запуск: uvx --with-requirements requirements.txt python experiments/lab12_tp_gradient.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import warehouse as W  # noqa: E402
from pipetwin.train import MODEL_FAMILIES, make_model, pearson_r2  # noqa: E402

SEEDS = (42, 7, 2024)


# ------------------------------------------------------------ новые признаки
def tp_boundary(ds: pd.DataFrame) -> pd.DataFrame:
    """Средние граничные T/P по окну [start, end]; окно пустое -> вся история
    трубы (как features.regime_features). p_*_fact не берём: start весь NaN,
    end покрыт на 6%."""
    reg = W.query("""select pipe_id as id, calc_date,
                            t_start_c, t_end_c, p_start_atm, p_end_atm
                     from core.regime_daily""")
    cols = ["t_start_c", "t_end_c", "p_start_atm", "p_end_atm"]
    rows = []
    for (pid, s, e), _ in ds.groupby(["id", "start", "end"]):
        w = reg[(reg["id"] == pid) & (reg["calc_date"] >= s) & (reg["calc_date"] <= e)]
        if w.empty:
            w = reg[reg["id"] == pid]
        rows.append({"id": pid, "start": s, "end": e,
                     **{f"{c}_m": w[c].mean() for c in cols}})
    return pd.DataFrame(rows)


def add_features(ds: pd.DataFrame) -> pd.DataFrame:
    ds = ds.drop(columns=[c for c in ALL_NEW if c in ds.columns])
    ds = ds.merge(tp_boundary(ds), on=["id", "start", "end"], how="left")
    pipe_len = ds["dist_m"] / ds["dist_frac"]  # = n_segments·SEG_LEN, константа
    ds["t_at"] = ds["t_start_c_m"] + ds["dist_frac"] * (ds["t_end_c_m"] - ds["t_start_c_m"])
    ds["p_at"] = ds["p_start_atm_m"] + ds["dist_frac"] * (ds["p_end_atm_m"] - ds["p_start_atm_m"])
    ds["t_grad"] = (ds["t_end_c_m"] - ds["t_start_c_m"]) / pipe_len   # °C/м
    ds["p_grad"] = (ds["p_end_atm_m"] - ds["p_start_atm_m"]) / pipe_len  # атм/м
    return ds.drop(columns=[c for c in ds.columns if c.endswith("_m") and c != "dist_m"])


GROUPS = {
    "t_at": ["t_at"],
    "p_at": ["p_at"],
    "tp_at": ["t_at", "p_at"],
    "grad": ["t_grad", "p_grad"],
}
ALL_NEW = sorted({f for g in GROUPS.values() for f in g})


# ------------------------------------------------------------------ оценка
def smooth5(va: pd.DataFrame, pred: np.ndarray) -> np.ndarray:
    s = pd.Series(pred, index=va.index)
    return (s.groupby([va["id"], va["end"]])
             .transform(lambda x: x.rolling(5, center=True, min_periods=1).median()).values)


def fit_eval(ds, val_split, train_mask, feats, seed) -> dict:
    C.SEED = seed
    tr = ds[(ds["split"] == "train") & train_mask]
    va = ds[ds["split"] == val_split].sort_values(["id", "end", "segment_id"])
    preds = []
    for fam in MODEL_FAMILIES:
        m = make_model(fam)
        m.fit(tr[feats], tr["y"])
        preds.append(m.predict(va[feats]))
    ens = np.mean(preds, axis=0)
    y = va["y"].values
    return {"ens": pearson_r2(y, ens), "ens_sm5": pearson_r2(y, smooth5(va, ens))}


def coverage(ds: pd.DataFrame) -> None:
    print("покрытие новых признаков (доля не-NaN):")
    print(ds[ALL_NEW].notna().mean().round(3).to_string())
    uniq = ds.groupby("id")["t_at"].nunique()
    print("уникальных t_at внутри трубы (должно быть >1, иначе признак выродился):")
    print(uniq.describe().round(2).to_string())
    print("труб с t_at.nunique() <= 1:", int((uniq <= 1).sum()), "из", len(uniq))


def main() -> None:
    ds, _ = F.build_all(extended=True)
    ds = add_features(ds)
    coverage(ds)

    is_comm = ds["kind"] == "comm2vtd"
    all_true = pd.Series(True, index=ds.index)
    configs = [("реф.", [])] + list(GROUPS.items())

    rows = []
    for case, split, mask in (("case1", "val_case1", all_true),
                              ("case2", "val_case2", is_comm)):
        ref = [f for f in F.case_features(ds, case) if f not in ALL_NEW]
        for gname, gfeats in configs:
            res = [fit_eval(ds, split, mask, ref + gfeats, s) for s in SEEDS]
            r = {"case": case, "add": gname}
            for k in ("ens", "ens_sm5"):
                v = np.array([x[k] for x in res])
                r[f"{k}_mean"], r[f"{k}_std"] = round(v.mean(), 4), round(v.std(), 4)
                r[f"{k}_seeds"] = " ".join(f"{x:.3f}" for x in v)
            rows.append(r)
            print(pd.DataFrame(rows).to_string(index=False), flush=True)
            print("-" * 70, flush=True)
    C.SEED = 42


# ------------------------------------------- подтверждение на боевом ансамбле
def fit_eval_full(ds, case, feats, seed) -> dict:
    """Как train.run: 3 бустинга + AFT, без тюнинга; r² сырой и со сглаживанием 5."""
    import xgboost
    from pipetwin.train import CASES, fit_aft
    C.SEED = seed
    cfg = CASES[case]
    sub = ds[ds["kind"].isin(cfg["train_kinds"])]
    tr = sub[sub["split"] == "train"]
    va = ds[ds["split"] == cfg["val_split"]].sort_values(["id", "end", "segment_id"])
    preds = []
    for fam in MODEL_FAMILIES:
        m = make_model(fam)
        m.fit(tr[feats], tr["y"])
        preds.append(m.predict(va[feats]))
    aft = fit_aft(tr[feats], tr["aft_lb"].values, tr["aft_ub"].values,
                  dist=cfg["aft"]["dist"], sigma=cfg["aft"]["sigma"])
    preds.append(va["wt_nom"].values - aft.predict(xgboost.DMatrix(va[feats])))
    ens = np.mean(preds, axis=0)
    y = va["y"].values
    return {"ens": pearson_r2(y, ens), "ens_sm5": pearson_r2(y, smooth5(va, ens))}


def confirm(groups: list[str]) -> None:
    """Группы — из argv после --confirm (прошедшие критерий в main); пусто = все."""
    from pipetwin.train import survival_labels
    ds, _ = F.build_all(extended=True)
    ds = survival_labels(add_features(ds))
    cfgs = [("реф.", [])] + [(g, GROUPS[g]) for g in (groups or GROUPS)]
    rows = []
    for case in ("case1", "case2"):
        ref = [f for f in F.case_features(ds, case) if f not in ALL_NEW]
        for gname, gfeats in cfgs:
            res = [fit_eval_full(ds, case, ref + gfeats, s) for s in SEEDS]
            r = {"case": case, "add": gname}
            for k in ("ens", "ens_sm5"):
                v = np.array([x[k] for x in res])
                r[f"{k}_mean"], r[f"{k}_std"] = round(v.mean(), 4), round(v.std(), 4)
                r[f"{k}_seeds"] = " ".join(f"{x:.3f}" for x in v)
            rows.append(r)
            print(pd.DataFrame(rows).to_string(index=False), flush=True)
    C.SEED = 42


if __name__ == "__main__":
    if "--confirm" in sys.argv:
        confirm(sys.argv[sys.argv.index("--confirm") + 1:])
    else:
        main()
