"""Этап 4: прогноз по двум целевым трубам, result.csv, интервалы, топ-10%."""
import joblib
import numpy as np
import pandas as pd

from . import config as C
from .train import predict_bag

# Предиктор по кейсу — выбор по СТАБИЛЬНОСТИ между прогонами (тюненный и нет),
# а не по максимуму одной таблицы: валидация кейса 1 — всего 55 сегментов.
# case1: ансамбль + роллинг-медиана 5 (0.163 и 0.220 в двух прогонах);
# case2: сырой ансамбль (0.088 и 0.110; сглаживание стабильно чуть хуже).
PREDICTOR = {"case1": ("ensemble", 5), "case2": ("ensemble", None)}


def run() -> pd.DataFrame:
    pred_ds = pd.read_csv(C.PROCESSED_DIR / "predict_dataset.csv", parse_dates=["start", "end"])
    bundle = joblib.load(C.ARTIFACTS_DIR / "models.joblib")

    # каждой целевой трубе — модель своего кейса
    case_of_id = {C.CASE1_ID: "case1", C.CASE2_ID: "case2"}
    parts = []
    for pipe_id, grp in pred_ds.groupby("id"):
        case = case_of_id[int(pipe_id)]
        b = bundle["cases"][case]
        models, feats = b["models"], b["features"]
        grp = grp.copy()
        X = grp[feats]
        name, smooth = PREDICTOR[case]
        scale = grp["wt_nom"].values if b.get("target") == "rel" else 1.0
        # ансамбль 3 бустингов + AFT, усреднённый по сидам (train.BAG_SEEDS)
        pred = predict_bag(models["bag"], X, grp["wt_nom"].values, scale)[name]
        if smooth:
            pred = (pd.Series(pred)
                    .rolling(smooth, center=True, min_periods=1).median().values)
        grp["thickness_pred"] = pred
        grp["p10"] = models["p10"].predict(X) * scale
        grp["p90"] = models["p90"].predict(X) * scale
        parts.append(grp)
    pred_ds = pd.concat(parts, ignore_index=True)

    # Сдвиг профиля в физичный диапазон (метрика сдвигонезависима): если
    # уровень прогноза выше номинала трубы (экстраполяция на более тонкую
    # трубу), опускаем весь профиль так, чтобы p99 лёг на номинал — иначе
    # клиппинг срезал бы профиль в константу и обнулил корреляцию.
    parts = []
    for _, grp in pred_ds.groupby("id"):
        grp = grp.copy()
        shift = max(0.0, float(np.quantile(grp["thickness_pred"], 0.99))
                    - float(grp["wt_nom"].iloc[0]))
        for col in ("thickness_pred", "p10", "p90"):
            grp[col] = grp[col] - shift
        parts.append(grp)
    pred_ds = pd.concat(parts, ignore_index=True)

    for col in ("thickness_pred", "p10", "p90"):
        # физические рамки: не тоньше 0.5 мм, не толще номинала
        pred_ds[col] = pred_ds[col].clip(lower=0.5, upper=pred_ds["wt_nom"])
    pred_ds["p10"] = np.minimum(pred_ds["p10"], pred_ds["thickness_pred"])
    pred_ds["p90"] = np.maximum(pred_ds["p90"], pred_ds["thickness_pred"])

    result = pred_ds[["id", "segment_id", "thickness_pred"]].copy()
    result["thickness_pred"] = result["thickness_pred"].round(3)
    result.to_csv(C.ROOT / "result.csv", index=False)

    pred_ds[["id", "segment_id", "thickness_pred", "p10", "p90"]].round(3).to_csv(
        C.ARTIFACTS_DIR / "uncertainty.csv", index=False)

    top = pd.concat([
        g.nsmallest(max(1, int(np.ceil(len(g) * 0.10))), "p10")
        for _, g in pred_ds.groupby("id")
    ])
    top[["id", "segment_id", "thickness_pred", "p10"]].round(3).to_csv(
        C.ARTIFACTS_DIR / "top_risk_segments.csv", index=False)
    return result
