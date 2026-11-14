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
                  # calib="prev" (lab41) и shrink=dict(lam=0.5, win=5) (lab60) выключены:
                  # на честной валидации (exp/honest-val) оба вредят, см. lab63
                  blend_w=2.0, gap_w=0.5, calib=None, shrink=None,
                  # lab63: медиана LGBM/XGB/AFT вместо среднего (honest 8/8 по r², r2d, MAE)
                  member_agg="median",
                  quant_scale=1.2),  # lab73: разброс quant_cal/dens_quant_cal = 1.2·std(ens_blend)
    "case2": dict(val_split="val_case2", train_kinds=("comm2vtd",),
                  target="abs", families=("lgbm",), aft=None,
                  param_grid=PARAM_GRID, calibrate=True,
                  prior_w=0.5, prior_pipe=C.CASE2_ID),
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
                scale=1.0, agg: str = "mean") -> dict[str, np.ndarray]:
    """Прогноз толщины: члены ансамбля усреднены по сидам + общий ансамбль.

    Состав членов берётся из самого бэга (кейс 2 — только LGBM, без AFT).
    """
    fams = [f for f in MODEL_FAMILIES if f in bag[0]]
    out = {f: np.mean([m[f].predict(X) for m in bag], axis=0) * scale
           for f in fams}
    if "aft" in bag[0]:
        dm = xgboost.DMatrix(X)
        out["aft"] = wt_nom - np.mean([m["aft"].predict(dm) for m in bag], axis=0)
    # agg="median" — медиана членов (lab63, кейс 1): на честной валидации r² бленда
    # 0.226 -> 0.256, r2d 0.063 -> 0.102, MAE 0.335 -> 0.322 (8/8 сидов)
    out["ensemble"] = (np.median if agg == "median" else np.mean)(list(out.values()), axis=0)
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


def analog_rates(rows: pd.DataFrame, direction: str, dir_of: dict) -> np.ndarray:
    """Скорости потери (мм/год) обучающих пар «ввод→ВТД» того же направления.

    Аналог по направлению = та же среда (нефть товарная ЦППН / сырая Куст-1).
    Нет аналогов — все пары."""
    a = rows[rows["id"].map(dir_of) == direction]
    a = a if len(a) else rows
    return ((a["wt_nom"] - a["y"]) / a["age_end"]).to_numpy(float)


def fit_relief_prior(rows: pd.DataFrame, C_reg: float = 0.1):
    """Рельефный приор дефекта (lab39): логистическая регрессия had_defect на
    относительных признаках рельефа (features.PRIOR_FEATS), обученная на трубах
    режима целевой (для 9583 — направление ДНС-1→ЦППН-1, нефть товарная).

    LOPO по трубам ЦППН AUC 0.66/0.64/0.50/0.65, перенос на 22871 AUC 0.58; знаки:
    дефекты на затяжных подъёмах и выше локального дна (z_rel, lowness_250m,
    climb_rise > 0; sag_31, pocket_depth < 0). Детерминирован (сид не влияет)."""
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    m = make_pipeline(StandardScaler(), LogisticRegression(C=C_reg, max_iter=2000))
    return m.fit(rows[F.PRIOR_FEATS].fillna(0.0), rows["had_defect"].astype(int))


def prior_blend(ens: np.ndarray, p: np.ndarray, w: float) -> np.ndarray:
    """z(ens) + w·z(−P) в уровне ens. Если ens на трубе константа (у 9583 так: бустинг
    не различает её сегменты), форму целиком даёт приор; масштаб потом ставит
    calibrate_level по физическим якорям."""
    if float(np.std(ens)) > 1e-9:
        return blend_prob(ens, p, w)
    return float(np.mean(ens)) + zscore(-p)


def calibrate_level(pred: np.ndarray, wt_nom: float, age: float,
                    rates: np.ndarray) -> np.ndarray:
    """Аффинная калибровка уровня/масштаба профиля кейса 2 по физике (lab37, R3).

    Два якоря: среднее профиля = номинал − средняя скорость потери аналогов × возраст,
    максимум профиля = номинал (нетронутая стенка; якорь p99 клипал верхний 1% и с
    насыщенным приором сжимал полтрубы 9583 к номиналу — lab39c). Пирсон инвариантен
    (положительный аффинный сдвиг), меняются MAE/RMSE и физичность уровня.
    V1 MAE 0.861 -> 0.818, строгая V2 0.936 -> 0.922; у 9583 полка 3.740 -> 4.395 мм
    (аналоги ЦППН теряют 0.003 мм/год, а не 0.026, как подразумевала полка 3.740)."""
    m_t = wt_nom - float(np.mean(rates)) * age
    hi, mu = float(np.max(pred)), float(np.mean(pred))
    b = max((wt_nom - m_t) / (hi - mu) if hi - mu > 1e-9 else 0.0, 0.0)
    return m_t + b * (pred - mu)


def calibrate_mm(blend: np.ndarray, ens: np.ndarray, prev_min: np.ndarray) -> np.ndarray:
    """Калибровка бленда в мм (lab41): форма z(бленда), уровень — медиана ens,
    разброс — разброс минимумов прошлого пропуска этой трубы.

    Пирсон к аффинному преобразованию инвариантен — r² не меняется. Бленд
    наследовал разброс ens (0.31 мм на валидации), а реальный разброс толщин
    за 1.4 года почти тот же, что у прошлого пропуска (0.55 против 0.50):
    прогноз был сжат к среднему. Масштаб std(prev_min) — правило без подбора
    (прошлый профиль известен в момент прогноза), медиана — уровень под MAE.
    Валидация, 8/8 сидов: MAE 0.279 -> 0.267, RMSE 0.374 -> 0.356, MAPE 4.90 -> 4.66%.
    ВЫКЛЮЧЕНО (calib=None): на честной валидации MAE 0.335 -> 0.357 — честная корреляция
    0.47, MSE-оптимальный разброс r·σy = 0.26 мм меньше std(ens) 0.335, растягивать нельзя.
    Внутренний CV по train-парам 2018->2022 для калибровки непригоден:
    модель там без навыка (r² 0.00-0.05), подогнанный наклон ломает и r², и MAE.
    """
    scale = float(np.std(prev_min))
    if scale < 1e-12:
        scale = float(np.std(ens))
    return zscore(blend) * scale + float(np.median(ens))


def shrink_target(df: pd.DataFrame, lam: float, win: int) -> pd.Series:
    """Денойз таргета (lab60): y -> (1−lam)·y + lam·медиана y по окну win сегментов пары.

    Минимум сегмента — крайняя статистика шумных замеров (корреляция остатка
    2022<->2023 по совпавшим дефектам 0.34): обучение формы на усреднённом к соседям
    минимуме убирает шум метки. База формы (бленд) учится на нём, уровень мм — от
    базы на реальном минимуме. ВЫКЛЮЧЕНО (shrink=None): на честной валидации r² 0.225 -> 0.209,
    r2d 0.063 -> 0.039 — выигрыш ниже был отбором по утечке выравнивания.
    Старая (утёкшая) валидация, парный джиттер базы 5×3: r² 0.602 -> 0.618,
    r2d (только дефектные) 0.200 -> 0.229, MAE 0.266 -> 0.256 — 15/15 по всем трём.
    """
    grp = ["id", "start", "end"]
    med = (df.sort_values(grp + ["segment_id"]).groupby(grp)["y"]
           .transform(lambda v: v.rolling(win, center=True, min_periods=1).median())
           .reindex(df.index))
    return (1 - lam) * df["y"] + lam * med


def conformal_halfwidths(resid: np.ndarray) -> dict[str, float]:
    """Сплит-конформные полуширины |невязки| для уровней 80% (p10-p90) и 90% (p05-p95).

    lab43: квантильный конверт CatBoost p10-p90 на валидации кейса 1 покрывал 13%
    (ширина 0.13 мм), с монотонностью вокруг прогноза — 31%; симметричный конформный
    интервал (кросс-фит по блокам валидации) — 83% при ширине 0.86 мм, уже CQR (80%/0.97)
    и асимметричного (86%/1.01).
    """
    a = np.sort(np.abs(resid))
    n = len(a)
    return {tag: float(a[min(n - 1, int(np.ceil((n + 1) * lvl)) - 1)])
            for tag, lvl in (("p10_p90", 0.8), ("p05_p95", 0.9))}


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


def stats_at_level(ens: np.ndarray, stats: np.ndarray, scale: float | None = None) -> np.ndarray:
    """Форма aligned_stats в уровне и разбросе ансамбля (aligned_stats_cal).

    r² тот же, что у aligned_stats (Пирсон инвариантен к аффинному), а MAE как у ансамбля:
    снаряд 2023 года показывает глубже, и уровень прошлого пропуска для мм не годится
    (валидация с измеренным сдвигом: MAE 0.375 -> 0.240 мм, experiments/lab23).
    """
    sd = float(np.std(ens)) if scale is None else float(scale)
    return zscore(stats) * sd + float(np.mean(ens))


def quant_score(ds: pd.DataFrame) -> np.ndarray:
    """Квантильная формула из nedra (ветка case1-improve): (q02 + q10 + q10 по ±1 сегменту) / 3, мм.

    Устойчивые квантили остатка прошлого выровненного пропуска вместо минимума: снаряд шумит,
    минимум сегмента — крайняя статистика шумных замеров.
    """
    return ((ds["prev_q02"] + ds["prev_q10"] + ds["prev_q10_nb3"]) / 3).to_numpy(dtype=float)


def dens_quant_score(ds: pd.DataFrame) -> np.ndarray:
    """Квантили прошлого выровненного пропуска + плотность дефектов вокруг (experiments/lab56b).

    z(q02) + z(q10) + z(q10 по ±1 сегменту) − z(число дефектов в окне ±2 сегмента), равные веса,
    в уровне/разбросе prev_min. Плотность — независимый от квантилей сигнал «зоны активной
    коррозии»: сегмент в густом поле дефектов истончается сильнее, чем такой же по q10 одиночный.
    Против quant (lab24) при измеренном сдвиге с ошибкой δ = −1/0/+1 м: r² 0.681/0.731/0.720 ->
    0.713/0.748/0.735, r2d 0.36/0.46/0.44 -> 0.44/0.51/0.49; от соседа 0.212 -> 0.289; на самой
    22871 (2018 -> 2022, 525 сегм.) 0.162 -> 0.224. Плато: окна ±1/±5 и вес 0.5 — то же.
    """
    s = (zscore(ds["prev_q02"].values) + zscore(ds["prev_q10"].values)
         + zscore(ds["prev_q10_nb3"].values) - zscore(ds["prev_ndef_w5"].values))
    base = ds["prev_min"].values
    return zscore(s) * float(np.std(base)) + float(np.mean(base))


def case1_stat_predictors(ds: pd.DataFrame, ens_blend: np.ndarray,
                          quant_scale: str | float = "ens") -> dict[str, np.ndarray]:
    """Предикторы кейса 1 поверх выровненного прошлого пропуска (без обучения) и их бленды с ансамблем.

    quant_scale (lab70/lab73) — разброс quant_cal и dens_quant_cal: "ens" — std(ens_blend) (как было),
    число k — k·std(ens_blend), "prev" — std(prev_min) трубы. MSE-оптимальный разброс r·σy при
    измеренном сдвиге (r ≈ 0.81-0.87) — 0.44-0.48 мм, а std(ens) на валидации 0.33: прогноз сжат к
    среднему. Принято k=1.2 (lab73, dens_quant_cal, оракул δ ∈ [−2, 2]): MAE 7/7 лучше (|δ|≤1:
    0.233 -> 0.215), RMSE 0.321 -> 0.298, r² тот же; сосед +0.004; self22 без изменений.
    "prev" в оракуле чуть лучше (0.207), но на self22 (прошлый пропуск — редкий снаряд 2018,
    std(prev_min) 1.01) MAE 0.398 -> 0.737 — правило ломается, если разброс прошлого пропуска
    раздут; ×1.2 не зависит от него. На 22871 оба дают ~0.63 мм. *_ens — прежний разброс.
    """
    st, qt, dq = aligned_stats_score(ds), quant_score(ds), dens_quant_score(ds)
    if quant_scale == "prev":
        sp = float(np.std(ds["prev_min"].values))
    elif isinstance(quant_scale, (int, float)):
        sp = float(quant_scale) * float(np.std(ens_blend))
    else:
        sp = None
    return {"aligned_stats": st, "aligned_stats_cal": stats_at_level(ens_blend, st),
            "ens_blend+stats": blend_stats(ens_blend, st),
            "quant": qt, "quant_cal": stats_at_level(ens_blend, qt, sp),
            "quant_cal_ens": stats_at_level(ens_blend, qt),
            "ens_blend+quant": blend_stats(ens_blend, qt),
            "dens_quant": dq, "dens_quant_cal": stats_at_level(ens_blend, dq, sp),
            "dens_quant_cal_ens": stats_at_level(ens_blend, dq)}


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


def _case2_shape(ens: np.ndarray, tr: pd.DataFrame, va: pd.DataFrame, cfg: dict,
                 dir_of: dict) -> dict[str, np.ndarray]:
    """Кейс 2 поверх бустинга: рельефный приор (lab39) и калибровка уровня (lab37).

    Приор учится на трубах режима целевой 9583 (направление ДНС-1→ЦППН-1), калибровка —
    на аналогах направления валидационной трубы; всё только из train."""
    out, base = {}, ens
    if cfg.get("prior_w"):
        pdir = dir_of[cfg["prior_pipe"]]
        prior = fit_relief_prior(tr[tr["id"].map(dir_of) == pdir])
        # логит, а не вероятность: сигмоида насыщается у низинной половины 9583 и давала
        # полку у номинала (55% сегментов в 4.49-4.50, lab39c); логит её снимает
        p_va = prior.decision_function(va[F.PRIOR_FEATS].fillna(0.0))
        base = out["ens_prior"] = prior_blend(ens, p_va, cfg["prior_w"])
    if cfg.get("calibrate"):
        name = "ens_prior_cal" if cfg.get("prior_w") else "ensemble_cal"
        out[name] = calibrate_level(base, float(va["wt_nom"].iloc[0]),
                                    float(va["age_end"].iloc[0]),
                                    analog_rates(tr, dir_of[int(va["id"].iloc[0])], dir_of))
    return out


# предиктор кейса 1 в predict.py (для прод-строки отчёта и конформных интервалов)
CASE1_PROD = os.environ.get("PIPETWIN_CASE1", "dens_quant_cal")


def run(tune_trials: int = 0) -> pd.DataFrame:
    ds = pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv", parse_dates=["start", "end"])
    ds = survival_labels(ds)

    from .prepare import load_passport
    dir_of = dict(load_passport()[["id", "direction"]].itertuples(index=False))
    report_rows = []
    val_frames = []  # посегментные валидационные прогнозы -> artifacts/val_predictions.csv (графики отчёта)
    bundle = {"cases": {}}
    for case, cfg in CASES.items():
        feats = F.case_features(ds, case)
        subset = ds[ds["kind"].isin(cfg["train_kinds"])]
        honest = subset[subset["split"] == "train_honest"]
        # train_honest — замена строк только для модели валидации; val_case1_measured — дубль
        # валидационных пар с иным выравниванием, только для отчёта (в финальное обучение
        # не идёт, иначе 55 пар учатся дважды)
        subset = subset[~subset["split"].isin(["train_honest", "val_case1_measured"])]
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
        hd_va = va["had_defect"].values.astype(bool)
        for name, p in baseline_predictions(va).items():
            report_rows.append(dict(
                case=case, model=name, n=len(va),
                pearson_r2=round(pearson_r2(y_va, p.values), 4),
                r2d=round(pearson_r2(y_va[hd_va], p.values[hd_va]), 4),
                mae=round(float(np.mean(np.abs(y_va - p.values))), 3),
                rmse=round(float(np.sqrt(np.mean((y_va - p.values) ** 2))), 3),
                mape=round(float(np.mean(np.abs(y_va - p.values) / y_va) * 100), 2)))

        best_params = {fam: (tune(fam, X_tr, y_tr, groups, tune_trials)
                             if tune_trials else dict(cfg.get("params", {}).get(fam, {})))
                       for fam in MODEL_FAMILIES}
        grid = (cfg.get("param_grid") if not tune_trials else None) or (best_params,)
        val_bag = [m for p in grid for m in fit_bag(
            X_tr, y_tr, tr["aft_lb"].values, tr["aft_ub"].values, p, cfg["aft"],
            families=cfg["families"])]
        clf_va = fit_clf(X_tr, tr["had_defect"]) if cfg.get("blend_w") else None
        q05_models = fit_q05_pair(X_tr, y_tr, cfg.get("params")) if cfg.get("blend_w") else None
        agg = cfg.get("member_agg", "mean")
        # calib="prev" (lab41) и shrink (lab60) на честной валидации отвергнуты и из пути
        # валидации убраны (lab63); функции оставлены для экспериментов

        def val_predictions(v: pd.DataFrame) -> dict[str, np.ndarray]:
            vp = predict_bag(val_bag, v[feats], v["wt_nom"].values,
                             v["wt_nom"].values if rel else 1.0, agg=agg)
            if clf_va is not None:
                q05_v = np.mean([m.predict(v[feats]) for m in q05_models], axis=0)
                vp["ens_blend"] = blend_prob(
                    vp["ensemble"], clf_va.predict_proba(v[feats])[:, 1], cfg["blend_w"],
                    gap=vp["ensemble"] - q05_v, gap_w=cfg.get("gap_w", 0.0))
            if case == "case1":
                vp.update(case1_stat_predictors(v, vp["ens_blend"],
                                                cfg.get("quant_scale", "ens")))
                # прод-путь (predict.py): предиктор кейса 1 + физические рамки [0.5 мм, номинал]
                vp[f"{CASE1_PROD}_phys"] = np.clip(vp[CASE1_PROD], 0.5, v["wt_nom"].values)
            if cfg.get("prior_w") or cfg.get("calibrate"):
                vp.update(_case2_shape(vp["ensemble"], tr, v, cfg, dir_of))
            for base_name in ("catboost", "ensemble", "ens_blend"):
                if base_name in vp:
                    vp[f"{base_name}_smooth5"] = (
                        pd.DataFrame({"id": v["id"].values, "p": vp[base_name]})
                        .groupby("id")["p"]
                        .transform(lambda s: s.rolling(5, center=True, min_periods=1).median())
                        .values)
            return vp

        blocks = [(case, va)]
        if case == "case1":
            # тот же val со сдвигом, измеренным по самой паре (features.build_all, measured=True)
            vm = ds[ds["split"] == "val_case1_measured"]
            if len(vm):
                blocks.append(("case1_measured", vm))
        confs = []
        for label, v in blocks:
            yv = v["y"].values
            hd = v["had_defect"].values.astype(bool)
            vp = val_predictions(v)
            val_frames.append(pd.DataFrame({"case": label, "id": v["id"].values,
                                            "segment_id": v["segment_id"].values, "y": yv,
                                            **{k: np.round(np.asarray(p, float), 4)
                                               for k, p in vp.items()}}))
            if case == "case1":
                confs.append(conformal_halfwidths(yv - vp[f"{CASE1_PROD}_phys"]))
                # аудит lab81: блок measured — оракул геометрии (сдвиг по самой паре через 2023),
                # его полуширины 0.32/0.49 на блоке «от соседа» покрывают 60%/78% вместо 80%/90%.
                # У 22871 сдвиг интерполирован по соседям (ошибка ~1 м, между блоками), поэтому
                # берём консервативный максимум по блокам (0.53/0.79: 82%/93% и 95%/98%)
                conf = {k: max(c[k] for c in confs) for k in confs[0]}
            for name, p in vp.items():
                report_rows.append(dict(
                    case=label, model=name, n=len(v),
                    pearson_r2=round(pearson_r2(yv, p), 4),
                    # r² только по дефектным сегментам (2 чистых сегмента валидации тянут r²)
                    r2d=round(pearson_r2(yv[hd], p[hd]), 4),
                    mae=round(float(np.mean(np.abs(yv - p))), 3),
                    rmse=round(float(np.sqrt(np.mean((yv - p) ** 2))), 3),
                    mape=round(float(np.mean(np.abs(yv - p) / yv) * 100), 2)))
        if case == "case2" and os.environ.get("PIPETWIN_VAL2_STRICT") != "1":
            # строгая проверка рядом (как PIPETWIN_VAL2_STRICT=1): валидационная труба
            # исключена из обучения целиком — у 9583 своих пропусков нет вовсе;
            # разрыв с официальной = вклад «своей» трубы (её пропуск 2022 в train)
            tr_s = tr[~tr["id"].isin(va["id"].unique())]
            sbag = [m for p in grid for m in fit_bag(
                tr_s[feats], tr_s["y"], tr_s["aft_lb"].values, tr_s["aft_ub"].values, p,
                cfg["aft"], families=cfg["families"])]
            sp = {"ensemble": predict_bag(sbag, va[feats], va["wt_nom"].values)["ensemble"]}
            sp.update(_case2_shape(sp["ensemble"], tr_s, va, cfg, dir_of))
            for name, p in sp.items():
                report_rows.append(dict(
                    case="case2_strict", model=name, n=len(va),
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
            ys_all = y_all
            shr = cfg.get("shrink")
            if shr:
                ys_all = shrink_target(subset, **shr)
                lab = survival_labels(subset.assign(y=ys_all))
                final["shape_bag"] = fit_bag(
                    X_all, ys_all, lab["aft_lb"].values, lab["aft_ub"].values,
                    best_params, cfg["aft"], families=cfg["families"])
            final["q05_pair"] = fit_q05_pair(X_all, ys_all, cfg.get("params"))
        for alpha, tag in ((0.05, "p05"), (0.1, "p10"), (0.9, "p90"), (0.95, "p95")):
            m = make_model("catboost", dict(best_params["catboost"]), alpha=alpha)
            m.fit(X_all, y_all)
            final[tag] = m
        if cfg.get("prior_w"):
            final["relief_prior"] = fit_relief_prior(
                subset[subset["id"].map(dir_of) == dir_of[cfg["prior_pipe"]]])
        if cfg.get("calibrate"):
            final["analog_rows"] = subset[["id", "wt_nom", "y", "age_end"]].reset_index(drop=True)
        if not cfg.get("blend_w"):
            conf = None
        bundle["cases"][case] = dict(conformal=conf, models=final, features=feats,
                                     params=best_params, target=cfg["target"],
                                     blend_w=cfg.get("blend_w"),
                                     gap_w=cfg.get("gap_w", 0.0),
                                     prior_w=cfg.get("prior_w"),
                                     calib=cfg.get("calib"),
                                     member_agg=cfg.get("member_agg", "mean"),
                                     quant_scale=cfg.get("quant_scale", "ens"))

    report = pd.DataFrame(report_rows)
    C.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, C.ARTIFACTS_DIR / "models.joblib")
    report.to_csv(C.ARTIFACTS_DIR / "validation_report.csv", index=False)
    pd.concat(val_frames, ignore_index=True).to_csv(C.ARTIFACTS_DIR / "val_predictions.csv",
                                                    index=False)
    (C.ARTIFACTS_DIR / "metrics.json").write_text(json.dumps(
        dict(report=report.to_dict("records"),
             params={c: b["params"] for c, b in bundle["cases"].items()},
             conformal={c: b.get("conformal") for c, b in bundle["cases"].items()}),
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
