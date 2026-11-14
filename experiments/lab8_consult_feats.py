"""Лаборатория, серия 8: признаки из консультации практика и обзора литературы.

notes/corrosion-literature-review.md §8-9:
  - mech   — мехпримеси воды (медиана по направлению; ρ с макс. скоростью купонов +0.22);
  - osi    — остаточное содержание ингибитора в воде (ρ −0.30 после 2013);
  - regime — доли суток ламинарного/переходного/турбулентного режима за горизонт
             (flow_regime_real; расслоение -> донная коррозия);
  - climb  — затяжные подъёмы: поток теряет энергию, эмульсия расслаивается,
             песок и вода идут по низу (практик: «с 500 до 845 м по чуть-чуть»);
  - x_climb — взаимодействие подъём × доля медленного потока.

Референс — текущие наборы case_features (case1: база; case2: база+УЗТ+эпохи).
Ансамбль 3 бустингов (как lab6, без AFT), 3 сида — оценка шума.
Запуск: uvx --with-requirements requirements.txt python experiments/lab8_consult_feats.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import prepare  # noqa: E402
from pipetwin import warehouse as W  # noqa: E402
from pipetwin.train import MODEL_FAMILIES, make_model, pearson_r2  # noqa: E402

SEEDS = (42, 7, 2024)
YEAR = pd.Timedelta(days=365.25)


# ------------------------------------------------------------ новые признаки
def coupon_chem() -> pd.DataFrame:
    """Мехпримеси и ОСИ по направлению (ОСИ нет в core — берём из raw)."""
    return W.query("""
        select replace(replace(core.txt("Protected Segment Name"), ' -> ', ' - '), 'т.вр. ', '')
                   as direction,
               median(core.num("Mechanical Impurities")) as grav_mech,
               median(case when core.num(Year) >= 2013
                           then core.num("OSI in Water Phase") end) as grav_osi
        from raw.repcorr_south group by 1""").dropna(subset=["direction"])


def climb_features(altitudes: pd.DataFrame, nseg: pd.Series) -> pd.DataFrame:
    """Непрерывные подъёмы по сглаженному профилю (окно 11 сегментов = 110 м)."""
    out = []
    for pipe_id, grp in altitudes.groupby("id"):
        n = nseg.loc[pipe_id]
        centers = (np.arange(n) + 0.5) * C.SEG_LEN
        z = pd.Series(np.interp(centers, grp["total_distance"], grp["z"]))
        zs = z.rolling(11, center=True, min_periods=1).mean()
        up = (zs.diff().fillna(0) > 0).astype(int)
        run_id = (up != up.shift()).cumsum()
        g = pd.DataFrame({"up": up, "run": run_id, "zs": zs})
        run_len = g.groupby("run")["up"].transform("size") * C.SEG_LEN
        run_rise = g.groupby("run")["zs"].transform(lambda s: s.iloc[-1] - s.iloc[0])
        pos = g.groupby("run").cumcount() * C.SEG_LEN
        df = pd.DataFrame({"id": pipe_id, "segment_id": np.arange(n)})
        df["climb_len"] = np.where(up == 1, run_len, 0.0)        # м, длина подъёма
        df["climb_rise"] = np.where(up == 1, run_rise, 0.0)      # м, набор высоты
        df["climb_pos"] = np.where(up == 1, pos, 0.0)            # м от начала подъёма
        # сколько метров набрано на последних 500 м трассы перед сегментом
        df["rise_500m"] = (zs - zs.shift(50)).clip(lower=0).fillna(0).values
        out.append(df)
    return pd.concat(out, ignore_index=True)


def regime_shares(ds: pd.DataFrame) -> pd.DataFrame:
    reg = W.query("""select pipe_id as id, calc_date, flow_regime
                     from core.regime_daily where flow_regime is not null""")
    rows = []
    for (pid, s, e), _ in ds.groupby(["id", "start", "end"]):
        w = reg[(reg["id"] == pid) & (reg["calc_date"] >= s) & (reg["calc_date"] <= e)]
        if w.empty:
            w = reg[reg["id"] == pid]
        vc = w["flow_regime"].value_counts(normalize=True)
        rows.append({"id": pid, "start": s, "end": e,
                     "rg_share_laminar": vc.get("Ламинарный", np.nan if w.empty else 0.0),
                     "rg_share_trans": vc.get("Переходный", np.nan if w.empty else 0.0),
                     "rg_share_turb": vc.get("Турбулентный", np.nan if w.empty else 0.0)})
    return pd.DataFrame(rows)


def add_features(ds: pd.DataFrame) -> pd.DataFrame:
    passport = prepare.load_passport()
    altitudes = prepare.load_altitudes()
    nseg = prepare.n_segments(altitudes)
    chem = coupon_chem()
    # после встраивания в features.py часть колонок уже есть — пересчитываем здесь
    ds = ds.drop(columns=[c for c in ALL_NEW if c in ds.columns])
    dirs = passport[["id", "direction"]].merge(chem, on="direction", how="left")
    for c in ("grav_mech", "grav_osi"):  # несматченные направления -> среднее (как grav_cl)
        dirs[c] = dirs[c].fillna(chem[c].mean())
    ds = ds.merge(dirs[["id", "grav_mech", "grav_osi"]], on="id", how="left")
    ds = ds.merge(climb_features(altitudes, nseg), on=["id", "segment_id"], how="left")
    ds = ds.merge(regime_shares(ds), on=["id", "start", "end"], how="left")
    ds["x_climb_slow"] = ds["rise_500m"] * ds["rg_share_slow"]
    ds["x_climb_mech"] = ds["climb_len"] * ds["grav_mech"] / 100.0
    return ds


GROUPS = {
    "mech": ["grav_mech"],
    "osi": ["grav_osi"],
    "regime": ["rg_share_laminar", "rg_share_trans", "rg_share_turb"],
    "climb": ["climb_len", "climb_rise", "climb_pos", "rise_500m"],
    "x_climb": ["x_climb_slow", "x_climb_mech"],
}
ALL_NEW = [f for g in GROUPS.values() for f in g]


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


def main() -> None:
    ds, _ = F.build_all(extended=True)
    ds = add_features(ds)
    print("покрытие новых признаков (доля не-NaN):")
    print(ds[ALL_NEW].notna().mean().round(3).to_string())
    print("уникальных значений по трубам в train:",
          ds[ds.split == "train"].groupby("id")[["grav_mech", "grav_osi"]].first()
          .nunique().to_dict())

    is_comm = ds["kind"] == "comm2vtd"
    all_true = pd.Series(True, index=ds.index)
    configs = [("реф.", [])] + list(GROUPS.items()) + [("все новые", ALL_NEW)]

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


def confirm() -> None:
    from pipetwin.train import survival_labels
    ds, _ = F.build_all(extended=True)
    ds = survival_labels(add_features(ds))
    plan = {"case1": [("реф.", []), ("regime", GROUPS["regime"])],
            "case2": [("реф.", []), ("climb", GROUPS["climb"]),
                      ("rise_500m", ["rise_500m"]),
                      ("climb+regime", GROUPS["climb"] + GROUPS["regime"])]}
    rows = []
    for case, cfgs in plan.items():
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
    confirm() if "--confirm" in sys.argv else main()
