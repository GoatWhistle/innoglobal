"""Этап 4: прогноз по двум целевым трубам, result.csv, интервалы, топ-10%."""
import joblib
import numpy as np
import pandas as pd

from . import config as C
from .train import aligned_stats_score, blend_prob, blend_stats, predict_bag

# Предиктор по кейсу — итог серий 13-15 (критерий: прирост против референса
# на всех 3 сидах по r² и sm5):
# case1: ансамбль + бленд классификатора дефекта (r² 0.268/0.315 против
#        0.177/0.261 у чистого ансамбля, MAE тоже лучше) + роллинг-медиана 5;
# case2: «ансамбль» = LGBM по сетке PARAM_GRID (0.175/0.148 против
#        0.157/0.127 у 4-членного ансамбля); классификатор там слеп
#        (AUC 0.56), бленд не положен, сглаживание стабильно чуть хуже.
#
# Сглаживание кейса 1 компенсировало сдвиг одометра между пропусками ВТД (до 8 м при сегменте
# 10 м). После выравнивания пропусков в координаты профиля (align.py, режим profile) оно размывает
# форму: на валидации ens_blend 0.501 без сглаживания против 0.287 со сглаживанием. Без
# выравнивания (PIPETWIN_ALIGN=off/line) сглаживание по-прежнему полезно.
#
# Кейс 1 по умолчанию — ens_blend+stats: равный бленд ens_blend и aligned_stats (устойчивые
# статистики выровненного прошлого пропуска, train.aligned_stats_score). Валидация 2022 -> 2023,
# 55 сегментов: при измеренном сдвиге (PIPETWIN_ALIGN_ORACLE=1 — так у 22871, сдвиг известен на обоих
# концах трубы) 0.646 против 0.543 у ens_blend; при сдвиге только от соседа 0.456 против 0.500.
# aligned_stats один даёт 0.676 / 0.339 — выше при точном сдвиге, но хрупок к ошибке сдвига.
# PIPETWIN_CASE1=ens_blend | aligned_stats | ens_blend+stats
import os as _os
from . import align as _align
_CASE1 = _os.environ.get("PIPETWIN_CASE1", "ens_blend+stats")
PREDICTOR = {"case1": (_CASE1, None if _align.MODE == "profile" else 5),
             "case2": ("ensemble", None)}


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
        # бэг, усреднённый по сидам/сетке (train.BAG_SEEDS / PARAM_GRID)
        preds = predict_bag(models["bag"], X, grp["wt_nom"].values, scale)
        if name in ("ens_blend", "ens_blend+stats"):
            # форма классификатора дефекта вклеивается в профиль этой трубы
            p_def = models["clf"].predict_proba(X)[:, 1]
            pred = blend_prob(preds["ensemble"], p_def, b["blend_w"])
            if name == "ens_blend+stats":
                pred = blend_stats(pred, aligned_stats_score(grp))
        elif name == "aligned_stats":
            pred = aligned_stats_score(grp)
        else:
            pred = preds[name]
        if smooth:
            pred = (pd.Series(pred)
                    .rolling(smooth, center=True, min_periods=1).median().values)
        grp["thickness_pred"] = pred
        for tag in ("p05", "p10", "p90", "p95"):
            grp[tag] = models[tag].predict(X) * scale
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
        for col in ("thickness_pred", "p05", "p10", "p90", "p95"):
            grp[col] = grp[col] - shift
        parts.append(grp)
    pred_ds = pd.concat(parts, ignore_index=True)

    for col in ("thickness_pred", "p05", "p10", "p90", "p95"):
        # физические рамки: не тоньше 0.5 мм, не толще номинала
        pred_ds[col] = pred_ds[col].clip(lower=0.5, upper=pred_ds["wt_nom"])
    # монотонность квантилей: p05 <= p10 <= прогноз <= p90 <= p95
    pred_ds["p10"] = np.minimum(pred_ds["p10"], pred_ds["thickness_pred"])
    pred_ds["p90"] = np.maximum(pred_ds["p90"], pred_ds["thickness_pred"])
    pred_ds["p05"] = np.minimum(pred_ds["p05"], pred_ds["p10"])
    pred_ds["p95"] = np.maximum(pred_ds["p95"], pred_ds["p90"])

    result = pred_ds[["id", "segment_id", "thickness_pred"]].copy()
    result["thickness_pred"] = result["thickness_pred"].round(3)
    result.to_csv(C.ROOT / "result.csv", index=False)

    pred_ds[["id", "segment_id", "thickness_pred", "p05", "p10", "p90", "p95"]].round(3).to_csv(
        C.ARTIFACTS_DIR / "uncertainty.csv", index=False)

    top = pd.concat([
        g.nsmallest(max(1, int(np.ceil(len(g) * 0.10))), "p10")
        for _, g in pred_ds.groupby("id")
    ])
    top[["id", "segment_id", "thickness_pred", "p10"]].round(3).to_csv(
        C.ARTIFACTS_DIR / "top_risk_segments.csv", index=False)
    return result
