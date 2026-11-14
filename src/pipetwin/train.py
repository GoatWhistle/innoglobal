"""Этап 3: базлайны, модели по кейсам, валидация.

Архитектура (итог лабораторных серий, см. experiments/):
  - case1 (между ВТД): все расширенные пары; ансамбль 3 бустинга + AFT,
    бэггинг по сидам, поверх — бленд классификатора дефекта (lab13-15);
  - case2 (от ввода): только пары "ввод -> ВТД"; одиночный LGBM,
    усреднённый по сетке PARAM_GRID (lab15, совет ментора).
"""
import json
import os

import joblib
import numpy as np
import pandas as pd
import xgboost
from catboost import CatBoostClassifier, CatBoostRegressor
from lightgbm import LGBMClassifier, LGBMRegressor
from xgboost import XGBClassifier, XGBRegressor

from . import config as C
from . import features as F

MODEL_FAMILIES = ("catboost", "lgbm", "xgb")
# Бэггинг ансамбля по сидам (experiments/lab10_seed_bagging.py): на кейсе 2
# корреляция профилей цели между независимыми прогонами 0.72 -> 0.95, r² не падает.
BAG_SEEDS = (42, 43, 44, 45, 46)
AFT_EPS = 0.01  # мм, нижняя граница потери металла

# Целевая труба кейса 2 (номинал 4.5 мм) тоньше всех обучающих (6-8 мм):
# абсолютная модель прогнозирует уровень ~5-6 мм. Проверенный вариант
# target="rel" (y/wt_nom) чинит уровень, но роняет r² формы 0.11 -> 0.04,
# поэтому отвергнут. Вместо него predict.py сдвигает готовый профиль в
# физичный диапазон аффинно — квадрат корреляции Пирсона к сдвигу инвариантен.
# aft: survival-модель XGBoost (потеря металла, интервальная цензура для
# бездефектных сегментов: ВТД не видит дефекты мельче порога чувствительности).
# Четвёртый член ансамбля, см. experiments/lab7_survival.py.
# Бэггинг по гиперпараметрам для кейса 2 (experiments/lab11_param_bagging.py):
# форма профиля цели зависела от настроек (corr 0.76 между наборами); среднее
# по сетке глубина × темп даёт corr 0.95 между независимыми сетками, r² 0.108.
# Используется без тюнинга; с --tune берутся подобранные параметры.
PARAM_GRID = tuple(
    {"catboost": dict(depth=d, learning_rate=lr),
     "lgbm": dict(num_leaves=2 ** d - 1, learning_rate=lr),
     "xgb": dict(max_depth=d, learning_rate=lr)}
    for d, lr in ((4, 0.03), (6, 0.05), (8, 0.10), (4, 0.10), (6, 0.03), (8, 0.05)))

# Итог лабораторных серий 13-16:
# - кейс 1: база LGBM + XGB + AFT, поверх — классификатор дефекта (AUC 0.97)
#   аффинным блендом z(ens) + w·z(−P). CatBoost из регрессионного ансамбля
#   исключён (lab16: все комбинации с ним хуже сглаженного бленда, без него —
#   лучше на всех сидах; bl_sm5 0.315→0.341). P признаком внутрь бустингов
#   не работает (lab14 feat), квантильная маршрутизация q05/q95 — тоже
#   (lab13: квантили, обученные на всех сегментах, сами липнут к полке).
#   CatBoost остаётся классификатором и квантильным конвертом p05-p95;
# - кейс 2: одна модель — LGBM, усреднённый по сетке PARAM_GRID, бьёт
#   4-членный ансамбль (0.175/0.148 против 0.157/0.127 на всех сидах,
#   lab15; подтверждено перебором 29 комбинаций в lab16); классификатор
#   там слеп (AUC 0.56), бленд не применяется.
# Пересвип бленда после выравнивания пропусков (align.py, profile): оптимум
# blend_w сдвинулся 1.0 -> плато 2.0-2.5 (на выровненных данных форма
# классификатора ценнее уровня базы; подтверждено на 8 сидах, 7/8 побед,
# средний прирост +0.026). Взято 2.0: 2.5 даёт +0.0008 к среднему, но худший
# сид проседает 0.313 -> 0.301. gap_w=0.5 полезен при больших blend_w
# (0.501 -> 0.512 на 3 сидах), при blend_w=1.0 вредил. Возврат CatBoost в
# базу не подтверждён (4/8 сидов) — lab16 в силе.
#
# Серия 21 (lab21, на выровненных данных): кейс 1 r² 0.512 -> 0.618 на 8/8 сидах,
# худший сид 0.313 -> 0.614 (сидовая хрупкость ушла):
# - классификатор — ансамбль CatBoost+LGBM+XGB усреднением вероятностей (+0.059);
# - AFT normal sigma 3.0 (мягче цензура; +0.024, в связке с быстрой базой лучше
#   logistic 2.0);
# - база и q05-пара — 300 деревьев / lr 0.1 (быстрый темп в связке даёт +0.007;
#   без компенсации темпом 300 деревьев теряют 0.12).
# Кейс 2 не трогать: 300 деревьев теряют 0.01 при любом lr, классификатор слеп.
# Веса bw=2.0/gw=0.5 перепроверены свипом на новом конфиге: лучшее соседнее
# 2.5/0.75 даёт +0.002 — в пределах отбора, оставлены.
CASES = {
    "case1": dict(val_split="val_case1", train_kinds=("vtd2vtd", "comm2vtd"),
                  target="abs", families=("lgbm", "xgb"),
                  params={f: dict(n_estimators=300, learning_rate=0.1)
                          for f in ("lgbm", "xgb")},
                  aft=dict(dist="normal", sigma=3.0, lr=0.1, rounds=300),
                  blend_w=2.0, gap_w=0.5),
    "case2": dict(val_split="val_case2", train_kinds=("comm2vtd",),
                  target="abs", families=("lgbm",), aft=None,
                  param_grid=PARAM_GRID),
}


def survival_labels(ds: pd.DataFrame) -> pd.DataFrame:
    """Интервальные метки потери металла для AFT.

    Дефектный сегмент — точная метка; бездефектный — цензура
    [EPS, порог обнаружения пропуска] (минимальная зафиксированная
    потеря среди дефектных сегментов пары, но не менее 0.3 мм).
    """
    ds = ds.copy()
    loss = (ds["wt_nom"] - ds["y"]).clip(lower=AFT_EPS)
    # split в ключе: строки train_honest (те же труба/пропуск, иное выравнивание)
    # не должны менять порог исходных строк
    keys = ["id", "end", "split"] if "split" in ds else ["id", "end"]
    det = (ds[ds["had_defect"]].groupby(keys)
           .apply(lambda g: max(0.3, float((g["wt_nom"] - g["y"])
                                           .clip(lower=AFT_EPS).min())),
                  include_groups=False))
    thr = ds.set_index(keys).index.map(det).to_numpy().astype(float)
    thr = np.where(np.isnan(thr), 0.3, thr)
    ds["aft_lb"] = np.where(ds["had_defect"], loss, AFT_EPS)
    ds["aft_ub"] = np.where(ds["had_defect"], loss, thr)
    return ds


def fit_aft(X: pd.DataFrame, lb: np.ndarray, ub: np.ndarray,
            dist: str, sigma: float, lr: float = 0.05,
            rounds: int = 600) -> xgboost.Booster:
    dtr = xgboost.DMatrix(X)
    dtr.set_float_info("label_lower_bound", lb)
    dtr.set_float_info("label_upper_bound", ub)
    params = dict(objective="survival:aft", aft_loss_distribution=dist,
                  aft_loss_distribution_scale=sigma, tree_method="hist",
                  learning_rate=lr, max_depth=6, seed=C.SEED)
    return xgboost.train(params, dtr, num_boost_round=rounds)


def fit_bag(X: pd.DataFrame, y: pd.Series, lb: np.ndarray, ub: np.ndarray,
            params: dict, aft_cfg: dict | None, seeds=BAG_SEEDS,
            families=MODEL_FAMILIES) -> list[dict]:
    """Ансамбль (3 бустинга + AFT) на каждом сиде из seeds.

    От сида зависит только CatBoost (случайная сила разбиений, бутстрап);
    LightGBM, XGBoost и AFT без подвыборки детерминированы — они обучаются один
    раз, и все элементы бэга ссылаются на один объект (pickle хранит его однократно).
    """
    def seed_sensitive(fam: str) -> bool:
        p = params.get(fam, {})
        return fam == "catboost" or any(
            p.get(k, 1.0) < 1.0 for k in ("subsample", "colsample_bytree",
                                           "bagging_fraction", "feature_fraction"))

    bag, shared, seed0 = [], {}, C.SEED
    try:
        for s in seeds:
            C.SEED = s
            members = {}
            for f in families:
                if seed_sensitive(f) or f not in shared:
                    members[f] = make_model(f, dict(params.get(f, {}))).fit(X, y)
                    if not seed_sensitive(f):
                        shared[f] = members[f]
                else:
                    members[f] = shared[f]
            if aft_cfg:
                if "aft" not in shared:
                    shared["aft"] = fit_aft(X, lb, ub, dist=aft_cfg["dist"],
                                            sigma=aft_cfg["sigma"],
                                            lr=aft_cfg.get("lr", 0.05),
                                            rounds=aft_cfg.get("rounds", 600))
                members["aft"] = shared["aft"]
            bag.append(members)
    finally:
        C.SEED = seed0
    return bag


def predict_bag(bag: list[dict], X: pd.DataFrame, wt_nom: np.ndarray,
                scale=1.0) -> dict[str, np.ndarray]:
    """Прогноз толщины: члены ансамбля усреднены по сидам + общий ансамбль.

    Состав членов берётся из самого бэга (кейс 2 — только LGBM, без AFT).
    """
    fams = [f for f in MODEL_FAMILIES if f in bag[0]]
    out = {f: np.mean([m[f].predict(X) for m in bag], axis=0) * scale
           for f in fams}
    if "aft" in bag[0]:
        dm = xgboost.DMatrix(X)
        out["aft"] = wt_nom - np.mean([m["aft"].predict(dm) for m in bag], axis=0)
    out["ensemble"] = np.mean(list(out.values()), axis=0)
    return out


def pearson_r2(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Метрика организаторов: квадрат корреляции Пирсона. Плоский прогноз -> 0."""
    if (not np.all(np.isfinite(y_pred))
            or np.std(y_pred) < 1e-12 or np.std(y_true) < 1e-12):
        return 0.0
    r2 = float(np.corrcoef(y_true, y_pred)[0, 1] ** 2)
    return r2 if np.isfinite(r2) else 0.0


def zscore(a: np.ndarray) -> np.ndarray:
    s = float(np.std(a))
    return (a - np.mean(a)) / s if s > 1e-12 else np.zeros_like(a, dtype=float)


def blend_prob(ens: np.ndarray, p: np.ndarray, w: float,
               gap: np.ndarray | None = None, gap_w: float = 0.0) -> np.ndarray:
    """Форма z(ens) + w·z(−P) [+ gap_w·z(gap)], аффинно в уровень/разброс ens.

    Пирсон к аффинному преобразованию инвариантен, уровень мм сохраняется
    (MAE на валидации даже улучшился, lab14). gap = ens − q05 (lab19 gap+):
    широкий зазор до q05 — признак чистого сегмента (сигнал инвертированный,
    AUC 0.245), знак «плюс» это и использует; +0.011 sm5 на 8/8 сидах.
    """
    b = zscore(ens) + w * zscore(-p)
    if gap is not None and gap_w:
        b = b + gap_w * zscore(gap)
    return zscore(b) * float(np.std(ens)) + float(np.mean(ens))


def fit_q05_pair(X: pd.DataFrame, y: pd.Series, params: dict | None = None) -> list:
    """Пара LGBM+XGB на alpha=0.05 — спред до q05 для gap-члена бленда."""
    params = params or {}
    return [make_model(f, dict(params.get(f, {})), alpha=0.05).fit(X, y)
            for f in ("lgbm", "xgb")]


class AvgClf:
    """Ансамбль классификаторов дефекта: усреднение вероятностей CatBoost+LGBM+XGB.

    Одиночный CatBoost хрупок к сиду (на сиде 1 бленд падал до 0.31); усреднение
    трёх семейств гасит дисперсию формы и добавляет +0.059 к r² бленда (lab21).
    """

    def __init__(self, models: list):
        self.models = models

    def predict_proba(self, X) -> np.ndarray:
        p = np.mean([m.predict_proba(X)[:, 1] for m in self.models], axis=0)
        return np.column_stack([1.0 - p, p])


def fit_clf(X: pd.DataFrame, had_defect: pd.Series) -> AvgClf:
    """Классификатор «в сегменте будет дефект» — источник формы для бленда."""
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


def make_model(family: str, params: dict | None = None, alpha: float = 0.5):
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


def _search_space(family: str, trial) -> dict:
    lr = trial.suggest_float("learning_rate", 0.02, 0.15, log=True)
    if family == "catboost":
        return dict(learning_rate=lr, depth=trial.suggest_int("depth", 4, 8),
                    iterations=trial.suggest_int("iterations", 300, 1000, step=100),
                    l2_leaf_reg=trial.suggest_float("l2_leaf_reg", 1.0, 10.0, log=True))
    if family == "lgbm":
        return dict(learning_rate=lr, num_leaves=trial.suggest_int("num_leaves", 15, 63),
                    n_estimators=trial.suggest_int("n_estimators", 300, 1000, step=100),
                    min_child_samples=trial.suggest_int("min_child_samples", 10, 60))
    return dict(learning_rate=lr, max_depth=trial.suggest_int("max_depth", 3, 8),
                n_estimators=trial.suggest_int("n_estimators", 300, 1000, step=100),
                min_child_weight=trial.suggest_int("min_child_weight", 1, 20))


def tune(family: str, X_tr, y_tr, groups, n_trials: int) -> dict:
    """Optuna по GroupKFold на train (группа = труба x целевой пропуск)."""
    import optuna
    from sklearn.model_selection import GroupKFold

    optuna.logging.set_verbosity(optuna.logging.WARNING)
    gkf = GroupKFold(n_splits=min(4, groups.nunique()))

    def objective(trial):
        params = _search_space(family, trial)
        scores = []
        for tr_idx, va_idx in gkf.split(X_tr, y_tr, groups):
            m = make_model(family, dict(params))
            m.fit(X_tr.iloc[tr_idx], y_tr.iloc[tr_idx])
            scores.append(pearson_r2(y_tr.iloc[va_idx].values, m.predict(X_tr.iloc[va_idx])))
        return float(np.mean(scores))

    study = optuna.create_study(
        direction="maximize", sampler=optuna.samplers.TPESampler(seed=C.SEED))
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
    return study.best_params


def aligned_stats_score(ds: pd.DataFrame) -> np.ndarray:
    """Кейс 1 без обучения: устойчивое состояние стенки на прошлом выровненном пропуске.

    z(min) + z(q10) + z(q10 по ±1 сегменту) − z(log числа дефектов по ±1 сегменту), аффинно
    возвращённый в уровень/разброс prev_min (Пирсону масштаб безразличен). Работает, только если
    прошлый пропуск выровнен с целевым (align.py): без сдвига r² падает с ~0.68 до ~0.3.
    """
    s = (zscore(ds["prev_min"].values) + zscore(ds["prev_q10"].values)
         + zscore(ds["prev_q10_nb3"].values) - zscore(ds["prev_lnn_nb3"].values))
    base = ds["prev_min"].values
    return zscore(s) * float(np.std(base)) + float(np.mean(base))


def stats_at_level(ens: np.ndarray, stats: np.ndarray) -> np.ndarray:
    """Форма aligned_stats в уровне и разбросе ансамбля (aligned_stats_cal).

    r² тот же, что у aligned_stats (Пирсон инвариантен к аффинному), а MAE как у ансамбля:
    снаряд 2023 года показывает глубже, и уровень прошлого пропуска для мм не годится
    (валидация с измеренным сдвигом: MAE 0.375 -> 0.240 мм, experiments/lab23).
    """
    return zscore(stats) * float(np.std(ens)) + float(np.mean(ens))


def blend_stats(ens: np.ndarray, stats: np.ndarray) -> np.ndarray:
    """Равный бленд формы ансамбля и aligned_stats в уровне ансамбля."""
    b = zscore(ens) + zscore(stats)
    return zscore(b) * float(np.std(ens)) + float(np.mean(ens))


def baseline_predictions(ds: pd.DataFrame) -> dict[str, pd.Series]:
    """Два простых базлайна для таблицы сравнения."""
    rate = ds["grav_rate_mean"].fillna(0.1)
    return {
        "b1_nominal_minus_rate": ds["wt_nom"] - rate * ds["age_end"],
        "b2_prev_smoothed": ds["prev_min_sm21"],
    }


def run(tune_trials: int = 0) -> pd.DataFrame:
    ds = pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv", parse_dates=["start", "end"])
    ds = survival_labels(ds)

    report_rows = []
    bundle = {"cases": {}}
    for case, cfg in CASES.items():
        feats = F.case_features(ds, case)
        subset = ds[ds["kind"].isin(cfg["train_kinds"])]
        honest = subset[subset["split"] == "train_honest"]
        subset = subset[subset["split"] != "train_honest"]
        tr = subset[subset["split"] == "train"]
        if case == "case1" and len(honest):
            # честная валидация: строки труб валидации, выровненные без пропуска 2023
            # (features.honest_val_rows); замена на тех же позициях — порядок строк
            # влияет на бустинги, финальное обучение ниже — на исходных строках
            key = ["id", "start", "end", "kind", "segment_id"]
            mask = tr["id"].isin(honest["id"].unique()).to_numpy()
            rep = honest.set_index(key).loc[pd.MultiIndex.from_frame(tr.loc[mask, key])]
            tr = tr.copy()
            for c in rep.columns.drop("split"):
                tr.loc[mask, c] = rep[c].to_numpy()
        va = ds[ds["split"] == cfg["val_split"]]
        if case == "case2" and os.environ.get("PIPETWIN_VAL2_STRICT") == "1":
            # у целевой трубы кейса 2 нет ни одного пропуска: валидационная труба тоже
            # не должна попадать в обучение другими своими пропусками (ввод -> 2022, 2023)
            tr = tr[~tr["id"].isin(va["id"].unique())]
        rel = cfg["target"] == "rel"
        X_tr = tr[feats]
        y_tr = tr["y"] / tr["wt_nom"] if rel else tr["y"]
        va_scale = va["wt_nom"].values if rel else 1.0
        groups = tr["id"].astype(str) + "_" + tr["end"].astype(str)

        y_va = va["y"].values
        for name, p in baseline_predictions(va).items():
            report_rows.append(dict(
                case=case, model=name, n=len(va),
                pearson_r2=round(pearson_r2(y_va, p.values), 4),
                mae=round(float(np.mean(np.abs(y_va - p.values))), 3)))

        best_params = {fam: (tune(fam, X_tr, y_tr, groups, tune_trials)
                             if tune_trials else dict(cfg.get("params", {}).get(fam, {})))
                       for fam in MODEL_FAMILIES}
        grid = (cfg.get("param_grid") if not tune_trials else None) or (best_params,)
        val_bag = [m for p in grid for m in fit_bag(
            X_tr, y_tr, tr["aft_lb"].values, tr["aft_ub"].values, p, cfg["aft"],
            families=cfg["families"])]
        val_preds = predict_bag(val_bag, va[feats], va["wt_nom"].values, va_scale)
        if cfg.get("blend_w"):
            p_va = fit_clf(X_tr, tr["had_defect"]).predict_proba(va[feats])[:, 1]
            q05_va = np.mean([m.predict(va[feats])
                              for m in fit_q05_pair(X_tr, y_tr, cfg.get("params"))], axis=0)
            val_preds["ens_blend"] = blend_prob(
                val_preds["ensemble"], p_va, cfg["blend_w"],
                gap=val_preds["ensemble"] - q05_va, gap_w=cfg.get("gap_w", 0.0))
        if case == "case1":
            val_preds["aligned_stats"] = aligned_stats_score(va)
            val_preds["aligned_stats_cal"] = stats_at_level(val_preds["ens_blend"],
                                                            val_preds["aligned_stats"])
            val_preds["ens_blend+stats"] = blend_stats(val_preds["ens_blend"],
                                                       val_preds["aligned_stats"])
        for base_name in ("catboost", "ensemble", "ens_blend"):
            if base_name not in val_preds:
                continue
            val_preds[f"{base_name}_smooth5"] = (
                pd.DataFrame({"id": va["id"].values, "p": val_preds[base_name]})
                .groupby("id")["p"]
                .transform(lambda s: s.rolling(5, center=True, min_periods=1).median())
                .values)
        for name, p in val_preds.items():
            report_rows.append(dict(
                case=case, model=name, n=len(va),
                pearson_r2=round(pearson_r2(y_va, p), 4),
                mae=round(float(np.mean(np.abs(y_va - p))), 3)))

        # финальные модели кейса: дообучение на train + val этого кейса
        X_all = subset[feats]
        y_all = subset["y"] / subset["wt_nom"] if rel else subset["y"]
        bag = [m for p in grid for m in fit_bag(
            X_all, y_all, subset["aft_lb"].values, subset["aft_ub"].values,
            p, cfg["aft"], families=cfg["families"])]
        final = dict(bag[0])  # первый сид — для важностей признаков
        final["bag"] = bag
        if cfg.get("blend_w"):
            final["clf"] = fit_clf(X_all, subset["had_defect"])
            final["q05_pair"] = fit_q05_pair(X_all, y_all, cfg.get("params"))
        for alpha, tag in ((0.05, "p05"), (0.1, "p10"), (0.9, "p90"), (0.95, "p95")):
            m = make_model("catboost", dict(best_params["catboost"]), alpha=alpha)
            m.fit(X_all, y_all)
            final[tag] = m
        bundle["cases"][case] = dict(models=final, features=feats,
                                     params=best_params, target=cfg["target"],
                                     blend_w=cfg.get("blend_w"),
                                     gap_w=cfg.get("gap_w", 0.0))

    report = pd.DataFrame(report_rows)
    C.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, C.ARTIFACTS_DIR / "models.joblib")
    report.to_csv(C.ARTIFACTS_DIR / "validation_report.csv", index=False)
    (C.ARTIFACTS_DIR / "metrics.json").write_text(json.dumps(
        dict(report=report.to_dict("records"),
             params={c: b["params"] for c, b in bundle["cases"].items()}),
        ensure_ascii=False, indent=2, default=str))

    for case, b in bundle["cases"].items():
        fam = next(f for f in MODEL_FAMILIES if f in b["models"])
        m = b["models"][fam]
        vals = (m.get_feature_importance() if fam == "catboost"
                else m.feature_importances_)
        imp = pd.DataFrame({"feature": b["features"], "importance": vals})
        imp.sort_values("importance", ascending=False).to_csv(
            C.ARTIFACTS_DIR / f"feature_importance_{case}.csv", index=False)
    return report
