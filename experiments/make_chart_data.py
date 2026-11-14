"""Готовит JSON с данными для charts.html (прогнозы, валидация, физика)."""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import prepare  # noqa: E402
from pipetwin import warehouse as W  # noqa: E402
from pipetwin.train import (CASES, blend_prob, fit_bag, fit_clf,  # noqa: E402
                            fit_q05_pair, pearson_r2, predict_bag,
                            survival_labels)

OUT = Path(__file__).resolve().parents[1] / "chart_data.json"
np.random.seed(C.SEED)
data: dict = {}

# --- прогноз и неопределённость ---------------------------------------------
unc = pd.read_csv(C.ARTIFACTS_DIR / "uncertainty.csv")
top = pd.read_csv(C.ARTIFACTS_DIR / "top_risk_segments.csv")
top_set = set(map(tuple, top[["id", "segment_id"]].itertuples(index=False)))

passport = prepare.load_passport()
alt = prepare.load_altitudes()
nseg = prepare.n_segments(alt)
geom = F.geometry_features(alt, nseg)

data["profiles"] = {}
for pid, label, wt in ((C.CASE1_ID, "Кейс 1 · труба 22871 (ВТД 2022 → 01.12.2023)", 8.0),
                       (C.CASE2_ID, "Кейс 2 · труба 9583 (ввод 1993 → 01.07.2022)", 4.5)):
    u = unc[unc["id"] == pid].sort_values("segment_id")
    g = geom[geom["id"] == pid].sort_values("segment_id")
    data["profiles"][str(pid)] = dict(
        label=label, wt_nom=wt,
        seg=u["segment_id"].tolist(),
        pred=u["thickness_pred"].round(3).tolist(),
        p10=u["p10"].round(3).tolist(),
        p90=u["p90"].round(3).tolist(),
        z=g["z"].round(2).tolist(),
        risk=[int((pid, s) in top_set) for s in u["segment_id"]],
    )

# --- честные валидационные прогнозы (обучение только на train) ---------------
ds = pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv", parse_dates=["start", "end"])
ds = survival_labels(ds)
data["val"] = {}
# те же гиперпараметры, что у боевых моделей (Optuna, если run_all --tune)
best = json.loads((C.ARTIFACTS_DIR / "metrics.json").read_text())["params"]
for case, cfg in CASES.items():
    kinds, aftp = cfg["train_kinds"], cfg["aft"]
    tuned = any(best[case].values())
    grid = (best[case],) if tuned else (cfg.get("param_grid") or (best[case],))
    feats = F.case_features(ds, case)
    sub = ds[ds["kind"].isin(kinds)]
    tr = sub[sub["split"] == "train"]
    va = ds[ds["split"] == f"val_{case}"]
    bag = [m for prm in grid for m in fit_bag(
        tr[feats], tr["y"], tr["aft_lb"].values, tr["aft_ub"].values, prm, aftp,
        families=cfg["families"])]
    p = predict_bag(bag, va[feats], va["wt_nom"].values)["ensemble"]
    if cfg.get("blend_w"):  # кейс 1: бленд классификатора + gap q05 (lab13-19)
        p_def = fit_clf(tr[feats], tr["had_defect"]).predict_proba(va[feats])[:, 1]
        q05 = np.mean([m.predict(va[feats])
                       for m in fit_q05_pair(tr[feats], tr["y"])], axis=0)
        p = blend_prob(p, p_def, cfg["blend_w"], gap=p - q05,
                       gap_w=cfg.get("gap_w", 0.0))
    if case == "case1":
        p = (pd.DataFrame({"id": va["id"].values, "p": p}).groupby("id")["p"]
             .transform(lambda s: s.rolling(5, center=True, min_periods=1).median()).values)
    data["val"][case] = dict(
        fact=va["y"].round(3).tolist(), pred=np.round(p, 3).tolist(),
        r2=round(pearson_r2(va["y"].values, p), 3))

# --- два пропуска ВТД на одной трубе (шум приборов) ---------------------------
vtd = prepare.load_vtd()
p22 = vtd[(vtd["id"] == C.CASE1_ID) & vtd["Residual Wall Thickness"].notna()]
runs = {}
for d in ("23.09.2018", "06.07.2022"):
    m = p22[p22["run_date"] == pd.to_datetime(d, dayfirst=True)].groupby("segment_id")[
        "Residual Wall Thickness"].min()
    runs[d] = {int(k): round(float(v), 2) for k, v in m.items()}
data["vtd_runs"] = runs

# --- угловое распределение внутренних дефектов -------------------------------
# очищенный слой core.ili_feature: глубина ВТД-2018 переведена из долей в %
vint = vtd.loc[vtd["Defect Type"] == "internal", ["Angle", "Defect Depth in %"]].dropna()
bins = pd.cut(vint["Angle"], bins=np.arange(0, 361, 30), include_lowest=True)
grp = vint.groupby(bins, observed=True)
data["angle"] = dict(
    sector=[int(iv.right) for iv in grp.size().index],
    n=grp.size().tolist(),
    depth=grp["Defect Depth in %"].mean().round(1).tolist())

# --- гравиметрия по годам -----------------------------------------------------
rep = W.query("select year, rate_avg_mm_y from core.corrosion_coupon")
g = rep.groupby("year")["rate_avg_mm_y"].median().dropna()
data["grav"] = dict(year=[int(y) for y in g.index], rate=g.round(3).tolist())

# --- важность признаков -------------------------------------------------------
data["imp"] = {}
for case in ("case1", "case2"):
    fi = pd.read_csv(C.ARTIFACTS_DIR / f"feature_importance_{case}.csv").head(8)
    data["imp"][case] = dict(feature=fi["feature"].tolist(),
                             importance=fi["importance"].round(1).tolist())

OUT.write_text(json.dumps(data, ensure_ascii=False))
print("OK", OUT, f"{OUT.stat().st_size/1024:.0f}KB",
      "| val r2:", {k: v["r2"] for k, v in data["val"].items()})
