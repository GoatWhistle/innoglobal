"""Этап 4: прогноз по двум целевым трубам, result.csv, интервалы, топ-10%."""
import joblib
import numpy as np
import pandas as pd

from . import config as C
from . import curve
from .train import (aligned_stats_score, blend_prob, blend_stats, calibrate_mm, predict_bag,
                    stats_at_level)

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
# Кейс 1 по умолчанию — aligned_stats_cal: форма aligned_stats (устойчивые статистики выровненного
# прошлого пропуска, train.aligned_stats_score) в уровне и разбросе ens_blend. Выбор по трём
# валидациям (experiments/lab23_case1_candidates.py, notes/case1_stats_rationale.md, раздел 8):
#                       от соседа (55)   сдвиг измерен (55)   сама 22871 2018->2022 (525)
#   ens_blend               0.693             0.599                 0.011
#   ens_blend+stats         0.546             0.690                 0.060
#   aligned_stats_cal       0.273             0.701                 0.215
# Режим «от соседа» даёт сдвигу 1250011604 ошибку 6-11 м, которой в прогнозе 22871 нет (сдвиг измерен
# на обоих концах); в двух других aligned_stats_cal лучший по r², MAE, RMSE, Спирмену и топ-10%.
# PIPETWIN_CASE1=aligned_stats_cal | aligned_stats | ens_blend+stats | ens_blend
import os as _os
from . import align as _align
_CASE1 = _os.environ.get("PIPETWIN_CASE1", "aligned_stats_cal")
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
        agg = b.get("member_agg", "mean")
        preds = predict_bag(models["bag"], X, grp["wt_nom"].values, scale, agg=agg)
        if name in ("ens_blend", "ens_blend+stats", "aligned_stats_cal"):
            # формы классификатора дефекта и спреда до q05 вклеиваются
            # в профиль этой трубы (lab13-19)
            p_def = models["clf"].predict_proba(X)[:, 1]
            q05 = np.mean([m.predict(X) for m in models["q05_pair"]], axis=0)
            # форма — база на денойзнутом таргете (lab60), уровень — база на минимуме
            shape = (predict_bag(models["shape_bag"], X, grp["wt_nom"].values,
                                 agg=agg)["ensemble"]
                     if "shape_bag" in models else preds["ensemble"])
            pred = blend_prob(shape, p_def, b["blend_w"],
                              gap=shape - q05,
                              gap_w=b.get("gap_w", 0.0))
            if b.get("calib") == "prev":
                pred = calibrate_mm(pred, preds["ensemble"], grp["prev_min"].values)
            if name == "ens_blend+stats":
                pred = blend_stats(pred, aligned_stats_score(grp))
            elif name == "aligned_stats_cal":
                pred = stats_at_level(pred, aligned_stats_score(grp))
        elif name == "aligned_stats":
            pred = aligned_stats_score(grp)
        else:
            pred = preds[name]
        if smooth:
            pred = (pd.Series(pred)
                    .rolling(smooth, center=True, min_periods=1).median().values)
        grp["thickness_pred"] = pred
        conf = b.get("conformal")
        if conf:
            # кейс 1: конформный интервал вокруг прогноза (lab43), покрытие 80%/90%;
            # центр — уже в физических рамках (невязки считались по клиппированному)
            center = np.clip(pred, 0.5, grp["wt_nom"].values)
            for lo, hi, key in (("p10", "p90", "p10_p90"), ("p05", "p95", "p05_p95")):
                grp[lo] = center - conf[key]
                grp[hi] = center + conf[key]
        else:
            for tag in ("p05", "p10", "p90", "p95"):
                grp[tag] = models[tag].predict(X) * scale
        parts.append(grp)
    pred_ds = pd.concat(parts, ignore_index=True)

    # Сдвиг профиля в физичный диапазон (метрика сдвигонезависима): если
    # уровень прогноза выше номинала трубы (экстраполяция на более тонкую
    # трубу), опускаем весь профиль так, чтобы p99 лёг на номинал — иначе
    # клиппинг срезал бы профиль в константу и обнулил корреляцию.
    # Только кейс 2 (уровень экстраполирован на более тонкую трубу). Кейс 1 — клиппинг без сдвига
    # (lab33): z-бленды кейса 1 могут вынести ~1% чистых сегментов за номинал, и сдвиг p99 опустил
    # бы весь профиль (у ens_blend+stats на 22871 — на 0.49 мм), хотя уровень ансамбля на валидации
    # несмещён (+0.02..0.03 мм). У дефолта aligned_stats_cal p99 ниже номинала — сдвига и так нет.
    parts = []
    for pid, grp in pred_ds.groupby("id"):
        grp = grp.copy()
        shift = 0.0 if case_of_id[int(pid)] == "case1" else max(
            0.0, float(np.quantile(grp["thickness_pred"], 0.99)) - float(grp["wt_nom"].iloc[0]))
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

    # кривая деградации по сегментам (физичная, монотонная) — для отчёта/демо
    curves = []
    for pipe_id, grp in pred_ds.groupby("id"):
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
