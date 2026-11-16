"""Обучение моделей обоих кейсов, валидация на исторических парах, сохранение артефактов.

Кейс 1 (между ВТД, предиктор dens_quant_cal):
  - база: медиана LightGBM + XGBoost (квантиль 0.5) и XGBoost AFT (survival-модель потери металла);
  - бленд: z(база) + 2·z(−P) + 0.5·z(база − q05), где P — вероятность дефекта в сегменте
    (усреднение CatBoost + LightGBM + XGBoost), q05 — квантиль 0.05 (пара LightGBM + XGBoost);
  - форма профиля: z(q02) + z(q10) + z(q10 по ±1 сегменту) − z(плотность дефектов ±2 сегмента)
    прошлого выровненного пропуска; уровень — среднее бленда, разброс — 1.2·std бленда;
  - интервалы: сплит-конформные полуширины по невязкам валидации.
Кейс 2 (от ввода, предиктор ens_prior_cal):
  - база: LightGBM, усреднённый по сетке гиперпараметров (только пары «ввод -> ВТД»);
  - форма: z(база) + 0.5·z(−логит рельефного приора) — логистическая регрессия «дефект в сегменте»
    на признаках рельефа, обученная на трубах того же направления, что целевая 9583;
  - уровень: номинал − средняя скорость потери аналогов направления × возраст; максимум = номинал;
  - интервалы: квантильный CatBoost (0.05/0.1/0.9/0.95), перенесённый за прогнозом.
"""
import json

import joblib
import numpy as np
import pandas as pd
import xgboost
from catboost import CatBoostClassifier, CatBoostRegressor
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier, XGBRegressor

from . import config as C
from . import features as F
from .prepare import load_passport

AFT_EPS = 0.01  # мм, нижняя граница потери металла
QUANTILES = ((0.05, "p05"), (0.1, "p10"), (0.9, "p90"), (0.95, "p95"))

# Сетка гиперпараметров кейса 2: среднее по ней стабилизирует форму профиля
# (корреляция прогнозов между отдельными наборами 0.76, между независимыми сетками 0.95).
CASE2_GRID = tuple(dict(num_leaves=2 ** d - 1, learning_rate=lr)
                   for d, lr in ((4, 0.03), (6, 0.05), (8, 0.10), (4, 0.10), (6, 0.03), (8, 0.05)))

CASES = {
    "case1": dict(val_split="val_case1", train_kinds=("vtd2vtd", "comm2vtd"),
                  families=("lgbm", "xgb"),
                  grid=(dict(n_estimators=300, learning_rate=0.1),),
                  aft=dict(dist="normal", sigma=3.0, lr=0.1, rounds=300),
                  member_agg="median", blend_w=2.0, gap_w=0.5, quant_scale=1.2),
    "case2": dict(val_split="val_case2", train_kinds=("comm2vtd",),
                  families=("lgbm",), grid=CASE2_GRID, aft=None,
                  member_agg="mean", prior_w=0.5, prior_pipe=C.CASE2_ID),
}


# ------------------------------------------------------------------ модели
def make_model(family: str, params: dict | None = None, alpha: float = 0.5):
    """Квантильный регрессор (alpha=0.5 — медиана)."""
    params = dict(params or {})
    if family == "catboost":
        return CatBoostRegressor(
            loss_function=f"Quantile:alpha={alpha}", random_seed=C.SEED, verbose=0,
            iterations=params.pop("iterations", 600),
            learning_rate=params.pop("learning_rate", 0.05),
            depth=params.pop("depth", 6), **params)
    if family == "lgbm":
        return LGBMRegressor(
            objective="quantile", alpha=alpha, random_state=C.SEED, verbosity=-1,
            n_estimators=params.pop("n_estimators", 600),
            learning_rate=params.pop("learning_rate", 0.05),
            num_leaves=params.pop("num_leaves", 31), **params)
    if family == "xgb":
        return XGBRegressor(
            objective="reg:quantileerror", quantile_alpha=alpha, random_state=C.SEED,
            n_estimators=params.pop("n_estimators", 600),
            learning_rate=params.pop("learning_rate", 0.05),
            max_depth=params.pop("max_depth", 6), verbosity=0, **params)
    raise ValueError(family)


def survival_labels(ds: pd.DataFrame) -> pd.DataFrame:
    """Интервальные метки потери металла для AFT.

    Дефектный сегмент — точная метка; бездефектный — цензура [EPS, порог обнаружения пропуска]
    (минимальная зафиксированная потеря среди дефектных сегментов пары, но не менее 0.3 мм).
    """
    ds = ds.copy()
    loss = (ds["wt_nom"] - ds["y"]).clip(lower=AFT_EPS)
    keys = ["id", "end", "split"] if "split" in ds else ["id", "end"]
    det = (ds[ds["had_defect"]].groupby(keys)
           .apply(lambda g: max(0.3, float((g["wt_nom"] - g["y"]).clip(lower=AFT_EPS).min())),
                  include_groups=False))
    thr = ds.set_index(keys).index.map(det).to_numpy().astype(float)
    thr = np.where(np.isnan(thr), 0.3, thr)
    ds["aft_lb"] = np.where(ds["had_defect"], loss, AFT_EPS)
    ds["aft_ub"] = np.where(ds["had_defect"], loss, thr)
    return ds


def fit_aft(X: pd.DataFrame, lb: np.ndarray, ub: np.ndarray, cfg: dict) -> xgboost.Booster:
    dtr = xgboost.DMatrix(X)
    dtr.set_float_info("label_lower_bound", lb)
    dtr.set_float_info("label_upper_bound", ub)
    params = dict(objective="survival:aft", aft_loss_distribution=cfg["dist"],
                  aft_loss_distribution_scale=cfg["sigma"], tree_method="hist",
                  learning_rate=cfg["lr"], max_depth=6, seed=C.SEED)
    return xgboost.train(params, dtr, num_boost_round=cfg["rounds"])


def fit_base(X: pd.DataFrame, y: pd.Series, rows: pd.DataFrame, cfg: dict) -> dict:
    """Базовый ансамбль кейса: семейства × сетка гиперпараметров (+ AFT)."""
    members = [{f: make_model(f, p).fit(X, y) for f in cfg["families"]} for p in cfg["grid"]]
    aft = fit_aft(X, rows["aft_lb"].values, rows["aft_ub"].values, cfg["aft"]) if cfg["aft"] else None
    return dict(members=members, aft=aft, agg=cfg["member_agg"])


def predict_base(base: dict, X: pd.DataFrame, wt_nom: np.ndarray) -> dict[str, np.ndarray]:
    """Прогнозы семейств (среднее по сетке) и их агрегат «ensemble»."""
    families = list(base["members"][0])
    out = {f: np.mean([m[f].predict(X) for m in base["members"]], axis=0) for f in families}
    if base["aft"] is not None:
        out["aft"] = wt_nom - base["aft"].predict(xgboost.DMatrix(X))
    agg = np.median if base["agg"] == "median" else np.mean
    out["ensemble"] = agg(list(out.values()), axis=0)
    return out


class AvgClf:
    """Вероятность дефекта в сегменте: усреднение CatBoost + LightGBM + XGBoost."""

    def __init__(self, models: list):
        self.models = models

    def predict_proba(self, X) -> np.ndarray:
        p = np.mean([m.predict_proba(X)[:, 1] for m in self.models], axis=0)
        return np.column_stack([1.0 - p, p])


def fit_clf(X: pd.DataFrame, had_defect: pd.Series) -> AvgClf:
    y = had_defect.astype(int)
    models = [
        CatBoostClassifier(iterations=600, learning_rate=0.05, depth=6,
                           random_seed=C.SEED, verbose=0),
        LGBMClassifier(n_estimators=600, learning_rate=0.05, num_leaves=31,
                       random_state=C.SEED, verbosity=-1),
        XGBClassifier(n_estimators=600, learning_rate=0.05, max_depth=6,
                      random_state=C.SEED, verbosity=0),
    ]
    for m in models:
        m.fit(X, y)
    return AvgClf(models)


def fit_q05_pair(X: pd.DataFrame, y: pd.Series, params: dict) -> list:
    """Пара LightGBM + XGBoost на квантиль 0.05 — зазор до неё входит в бленд кейса 1."""
    return [make_model(f, params, alpha=0.05).fit(X, y) for f in ("lgbm", "xgb")]


def fit_relief_prior(rows: pd.DataFrame):
    """Рельефный приор дефекта: логистическая регрессия had_defect на признаках рельефа."""
    m = make_pipeline(StandardScaler(), LogisticRegression(C=0.1, max_iter=2000))
    return m.fit(rows[F.PRIOR_FEATS].fillna(0.0), rows["had_defect"].astype(int))


# ------------------------------------------------------------------ формулы предикторов
def zscore(a: np.ndarray) -> np.ndarray:
    s = float(np.std(a))
    return (a - np.mean(a)) / s if s > 1e-12 else np.zeros_like(a, dtype=float)


def pearson_r2(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Квадрат корреляции Пирсона. Плоский прогноз -> 0."""
    if not np.all(np.isfinite(y_pred)) or np.std(y_pred) < 1e-12 or np.std(y_true) < 1e-12:
        return 0.0
    r2 = float(np.corrcoef(y_true, y_pred)[0, 1] ** 2)
    return r2 if np.isfinite(r2) else 0.0


def blend_prob(ens: np.ndarray, p: np.ndarray, w: float,
               gap: np.ndarray | None = None, gap_w: float = 0.0) -> np.ndarray:
    """z(ens) + w·z(−P) [+ gap_w·z(gap)] в уровне и разбросе ens."""
    b = zscore(ens) + w * zscore(-p)
    if gap is not None and gap_w:
        b = b + gap_w * zscore(gap)
    return zscore(b) * float(np.std(ens)) + float(np.mean(ens))


def case1_blend(models: dict, X: pd.DataFrame, wt_nom: np.ndarray, cfg: dict) -> dict:
    """Прогнозы базы кейса 1 и бленд с классификатором дефекта (ens_blend)."""
    out = predict_base(models["base"], X, wt_nom)
    q05 = np.mean([m.predict(X) for m in models["q05_pair"]], axis=0)
    out["ens_blend"] = blend_prob(out["ensemble"], models["clf"].predict_proba(X)[:, 1],
                                  cfg["blend_w"], gap=out["ensemble"] - q05, gap_w=cfg["gap_w"])
    return out


def dens_quant_score(ds: pd.DataFrame) -> np.ndarray:
    """Форма кейса 1 по прошлому выровненному пропуску, в уровне и разбросе его минимумов.

    z(q02) + z(q10) + z(q10 по ±1 сегменту) − z(плотность дефектов в окне ±2 сегмента).
    """
    s = (zscore(ds["prev_q02"].values) + zscore(ds["prev_q10"].values)
         + zscore(ds["prev_q10_nb3"].values) - zscore(ds["prev_ndef_w5"].values))
    base = ds["prev_min"].values
    return zscore(s) * float(np.std(base)) + float(np.mean(base))


def dens_quant_cal(ds: pd.DataFrame, ens_blend: np.ndarray, scale: float) -> np.ndarray:
    """Форма dens_quant в уровне ens_blend и разбросе scale·std(ens_blend)."""
    return (zscore(dens_quant_score(ds)) * scale * float(np.std(ens_blend))
            + float(np.mean(ens_blend)))


def prior_blend(ens: np.ndarray, p: np.ndarray, w: float) -> np.ndarray:
    """z(ens) + w·z(−P) в уровне ens. Если база на трубе — константа (у 9583 так),
    форму целиком даёт приор; масштаб потом ставит calibrate_level."""
    if float(np.std(ens)) > 1e-9:
        return blend_prob(ens, p, w)
    return float(np.mean(ens)) + zscore(-p)


def analog_rates(rows: pd.DataFrame, direction: str, dir_of: dict) -> np.ndarray:
    """Скорости потери (мм/год) обучающих пар «ввод -> ВТД» того же направления (та же среда)."""
    a = rows[rows["id"].map(dir_of) == direction]
    a = a if len(a) else rows
    return ((a["wt_nom"] - a["y"]) / a["age_end"]).to_numpy(float)


def calibrate_level(pred: np.ndarray, wt_nom: float, age: float, rates: np.ndarray) -> np.ndarray:
    """Аффинная калибровка профиля кейса 2: среднее = номинал − скорость аналогов × возраст,
    максимум = номинал (нетронутая стенка). r² Пирсона не меняется."""
    m_t = wt_nom - float(np.mean(rates)) * age
    hi, mu = float(np.max(pred)), float(np.mean(pred))
    b = max((wt_nom - m_t) / (hi - mu) if hi - mu > 1e-9 else 0.0, 0.0)
    return m_t + b * (pred - mu)


def case2_shape(ens: np.ndarray, prior, ds: pd.DataFrame, w: float) -> np.ndarray:
    """База кейса 2 + рельефный приор (ens_prior). Логит, а не вероятность: сигмоида насыщается."""
    return prior_blend(ens, prior.decision_function(ds[F.PRIOR_FEATS].fillna(0.0)), w)


def conformal_halfwidths(resid: np.ndarray) -> dict[str, float]:
    """Сплит-конформные полуширины |невязки| для уровней 80% (p10-p90) и 90% (p05-p95)."""
    a = np.sort(np.abs(resid))
    n = len(a)
    return {tag: float(a[min(n - 1, int(np.ceil((n + 1) * lvl)) - 1)])
            for tag, lvl in (("p10_p90", 0.8), ("p05_p95", 0.9))}


def baseline_predictions(ds: pd.DataFrame) -> dict[str, np.ndarray]:
    """Два простых базлайна для сравнения."""
    rate = ds["grav_rate_mean"].fillna(0.1)
    return {"b1_nominal_minus_rate": (ds["wt_nom"] - rate * ds["age_end"]).to_numpy(float),
            "b2_prev_smoothed": ds["prev_min_sm21"].to_numpy(float)}


# ------------------------------------------------------------------ обучение кейса
def fit_case(case: str, rows: pd.DataFrame, feats: list[str], dir_of: dict) -> dict:
    """Все модели кейса на строках rows."""
    cfg = CASES[case]
    X, y = rows[feats], rows["y"]
    models = dict(base=fit_base(X, y, rows, cfg))
    if case == "case1":
        models["clf"] = fit_clf(X, rows["had_defect"])
        models["q05_pair"] = fit_q05_pair(X, y, cfg["grid"][0])
    else:
        models["relief_prior"] = fit_relief_prior(
            rows[rows["id"].map(dir_of) == dir_of[cfg["prior_pipe"]]])
        models["analog_rows"] = rows[["id", "wt_nom", "y", "age_end"]].reset_index(drop=True)
    return models


def predict_case(case: str, models: dict, ds: pd.DataFrame, feats: list[str],
                 dir_of: dict) -> dict[str, np.ndarray]:
    """Промежуточные прогнозы и итоговый предиктор кейса (ключ «forecast»)."""
    cfg = CASES[case]
    X, wt_nom = ds[feats], ds["wt_nom"].values
    if case == "case1":
        out = case1_blend(models, X, wt_nom, cfg)
        out["dens_quant"] = dens_quant_score(ds)
        out["forecast"] = dens_quant_cal(ds, out["ens_blend"], cfg["quant_scale"])
        return out
    out = predict_base(models["base"], X, wt_nom)
    out["ens_prior"] = case2_shape(out["ensemble"], models["relief_prior"], ds, cfg["prior_w"])
    rates = analog_rates(models["analog_rows"], dir_of[int(ds["id"].iloc[0])], dir_of)
    out["forecast"] = calibrate_level(out["ens_prior"], float(ds["wt_nom"].iloc[0]),
                                      float(ds["age_end"].iloc[0]), rates)
    return out


PREDICTOR_NAME = {"case1": "dens_quant_cal", "case2": "ens_prior_cal"}
REPORTED = {"case1": ("lgbm", "xgb", "aft", "ensemble", "ens_blend", "dens_quant"),
            "case2": ("lgbm", "ens_prior")}


def _metrics(case: str, model: str, y: np.ndarray, p: np.ndarray, hd: np.ndarray) -> dict:
    return dict(case=case, model=model, n=len(y),
                pearson_r2=round(pearson_r2(y, p), 4),
                r2d=round(pearson_r2(y[hd], p[hd]), 4),  # только сегменты с дефектами
                mae=round(float(np.mean(np.abs(y - p))), 3),
                rmse=round(float(np.sqrt(np.mean((y - p) ** 2))), 3),
                mape=round(float(np.mean(np.abs(y - p) / y) * 100), 2))


def _honest_train(tr: pd.DataFrame, honest: pd.DataFrame) -> pd.DataFrame:
    """Строки труб валидации кейса 1 заменяются версиями, выровненными без пропуска 2023
    (features.honest_val_rows) — на тех же позициях: порядок строк влияет на бустинги."""
    if honest.empty:
        return tr
    key = ["id", "start", "end", "kind", "segment_id"]
    mask = tr["id"].isin(honest["id"].unique()).to_numpy()
    rep = honest.set_index(key).loc[pd.MultiIndex.from_frame(tr.loc[mask, key])]
    tr = tr.copy()
    for c in rep.columns.drop("split"):
        tr.loc[mask, c] = rep[c].to_numpy()
    return tr


def run() -> pd.DataFrame:
    ds = survival_labels(pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv",
                                     parse_dates=["start", "end"]))
    dir_of = dict(load_passport()[["id", "direction"]].itertuples(index=False))
    report, val_frames, bundle = [], [], {"cases": {}}
    for case, cfg in CASES.items():
        feats = F.case_features(ds, case)
        subset = ds[ds["kind"].isin(cfg["train_kinds"])]
        honest = subset[subset["split"] == "train_honest"]
        subset = subset[subset["split"] != "train_honest"]
        tr = subset[subset["split"] == "train"]
        if case == "case1":
            tr = _honest_train(tr, honest)
        va = ds[ds["split"] == cfg["val_split"]]

        # валидация: модели только на train, прогноз валидационной пары
        y, hd = va["y"].values, va["had_defect"].values.astype(bool)
        vp = predict_case(case, fit_case(case, tr, feats, dir_of), va, feats, dir_of)
        final_name = PREDICTOR_NAME[case]
        vp[final_name] = vp.pop("forecast")
        rows = {**baseline_predictions(va), **{k: vp[k] for k in REPORTED[case]},
                final_name: vp[final_name]}
        report += [_metrics(case, k, y, p, hd) for k, p in rows.items()]
        val_frames.append(pd.DataFrame({
            "case": case, "id": va["id"].values, "segment_id": va["segment_id"].values, "y": y,
            **{k: np.round(np.asarray(p, float), 4) for k, p in rows.items()}}))
        conformal = None
        if case == "case1":
            conformal = conformal_halfwidths(y - np.clip(vp[final_name], 0.5, va["wt_nom"].values))

        # финальные модели: train + валидационная пара кейса
        X_all, y_all = subset[feats], subset["y"]
        models = fit_case(case, subset, feats, dir_of)
        for alpha, tag in QUANTILES:
            models[tag] = make_model("catboost", alpha=alpha).fit(X_all, y_all)
        bundle["cases"][case] = dict(models=models, features=feats, conformal=conformal,
                                     predictor=final_name)

    report = pd.DataFrame(report)
    C.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, C.ARTIFACTS_DIR / "models.joblib")
    report.to_csv(C.ARTIFACTS_DIR / "validation_report.csv", index=False)
    pd.concat(val_frames, ignore_index=True).to_csv(C.ARTIFACTS_DIR / "val_predictions.csv",
                                                    index=False)
    (C.ARTIFACTS_DIR / "metrics.json").write_text(json.dumps(
        dict(report=report.to_dict("records"),
             predictor=PREDICTOR_NAME,
             conformal={c: b["conformal"] for c, b in bundle["cases"].items()}),
        ensure_ascii=False, indent=2))
    for case, b in bundle["cases"].items():
        m = b["models"]["base"]["members"][0]["lgbm"]
        imp = pd.DataFrame({"feature": b["features"], "importance": m.feature_importances_})
        imp.sort_values("importance", ascending=False).to_csv(
            C.ARTIFACTS_DIR / f"feature_importance_{case}.csv", index=False)
    return report
