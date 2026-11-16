"""Прогноз двух целевых труб: result.csv, интервалы, приоритет проверки, кривая деградации."""
import joblib
import numpy as np
import pandas as pd

from . import config as C
from . import curve
from .prepare import load_passport
from .train import predict_case

LO_MM = 0.5        # физический пол толщины
TOP_SHARE = 0.10   # доля сегментов в приоритете проверки
CASE_OF = {C.CASE1_ID: "case1", C.CASE2_ID: "case2"}
BANDS = ("p05", "p10", "p90", "p95")


def _forecast(grp: pd.DataFrame, b: dict, case: str, dir_of: dict) -> pd.DataFrame:
    grp = grp.copy()
    models, feats = b["models"], b["features"]
    out = predict_case(case, models, grp, feats, dir_of)
    pred = out["forecast"]
    grp["thickness_pred"] = pred
    if b["conformal"]:
        # кейс 1: конформный интервал вокруг прогноза, уже зажатого в физические рамки
        center = np.clip(pred, LO_MM, grp["wt_nom"].values)
        for lo, hi, key in (("p10", "p90", "p10_p90"), ("p05", "p95", "p05_p95")):
            grp[lo] = center - b["conformal"][key]
            grp[hi] = center + b["conformal"][key]
    else:
        # кейс 2: квантильный CatBoost; калибровка уровня сжимает разброс профиля, но не
        # неопределённость сегмента — конверт переносится за прогнозом с исходной шириной
        for tag in BANDS:
            grp[tag] = pred + (models[tag].predict(grp[feats]) - out["ensemble"])
    if case == "case2":
        # если уровень выше номинала (экстраполяция на более тонкую трубу), профиль опускается
        # так, чтобы p99 лёг на номинал: иначе клиппинг срезал бы его в константу
        shift = max(0.0, float(np.quantile(pred, 0.99)) - float(grp["wt_nom"].iloc[0]))
        for col in ("thickness_pred", *BANDS):
            grp[col] = grp[col] - shift
    return grp


def run() -> pd.DataFrame:
    pred_ds = pd.read_csv(C.PROCESSED_DIR / "predict_dataset.csv", parse_dates=["start", "end"])
    bundle = joblib.load(C.ARTIFACTS_DIR / "models.joblib")
    dir_of = dict(load_passport()[["id", "direction"]].itertuples(index=False))
    pred_ds = pd.concat([_forecast(g, bundle["cases"][CASE_OF[int(pid)]], CASE_OF[int(pid)], dir_of)
                         for pid, g in pred_ds.groupby("id")], ignore_index=True)

    for col in ("thickness_pred", *BANDS):  # физические рамки: [0.5 мм, номинал]
        pred_ds[col] = pred_ds[col].clip(lower=LO_MM, upper=pred_ds["wt_nom"])
    # монотонность: p05 <= p10 <= прогноз <= p90 <= p95
    pred_ds["p10"] = np.minimum(pred_ds["p10"], pred_ds["thickness_pred"])
    pred_ds["p90"] = np.maximum(pred_ds["p90"], pred_ds["thickness_pred"])
    pred_ds["p05"] = np.minimum(pred_ds["p05"], pred_ds["p10"])
    pred_ds["p95"] = np.maximum(pred_ds["p95"], pred_ds["p90"])

    curves = []
    for _, grp in pred_ds.groupby("id"):
        end = pd.Timestamp(grp["end"].iloc[0])
        date_in = end - grp["age_end"].iloc[0] * curve.YEAR
        date_prev = grp["start"].iloc[0] if grp["kind"].iloc[0] == "vtd2vtd" else None
        curves.append(curve.degradation_curve(grp, date_in.normalize(), date_prev, end))
    curves = pd.concat(curves, ignore_index=True)
    n_bad = curve.check_monotone(curves)
    assert n_bad == 0, f"кривая деградации растёт у {n_bad} сегментов"
    curves.to_csv(C.ARTIFACTS_DIR / "degradation_curve.csv", index=False)

    result = pred_ds[["id", "segment_id", "thickness_pred"]].copy()
    result["thickness_pred"] = result["thickness_pred"].round(3)
    result.to_csv(C.RESULT_CSV, index=False)
    pred_ds[["id", "segment_id", "thickness_pred", *BANDS]].round(3).to_csv(
        C.ARTIFACTS_DIR / "uncertainty.csv", index=False)

    # приоритет проверки — 10% сегментов с наименьшей прогнозной толщиной (при равенстве —
    # меньший segment_id)
    top = pd.concat([
        g.sort_values(["thickness_pred", "segment_id"]).head(max(1, int(np.ceil(len(g) * TOP_SHARE))))
        for _, g in pred_ds.groupby("id")])
    top[["id", "segment_id", "thickness_pred", "p10"]].round(3).to_csv(
        C.ARTIFACTS_DIR / "top_risk_segments.csv", index=False)
    return result
