"""Кривая деградации по сегменту: физичная (монотонно убывающая) траектория толщины.

Опоры по времени: ввод (номинал) -> прошлый ВТД (если есть) -> дата прогноза -> экстраполяция.
Замеры ВТД шумные (снаряд 2023 регрессирует к среднему: на валидации 22% сегментов
«толще», чем в 2022), поэтому прогноз выше прошлого минимума — не рост металла, а
шум прошлого замера. Монотонность обеспечивается так:
  - опора на прошлом ВТД = max(prev_min, прогноз) — согласование шумного замера;
  - скорость экстраполяции = долгосрочная (номинал − pred)/возраст ≥ 0. Краткосрочная
    (prev − pred)/Δt на 22871 шумная: от −1.2 до +0.8 мм/год, у 78/525 сегментов
    отрицательна, в среднем 0.26 мм/год против 0.09 долгосрочной и 0.02-0.03 по
    гравиметрии после 2013 — в ней сидит систематика снаряда 2023, экстраполировать
    её на 10 лет нельзя (дала бы 0.5 мм у четверти сегментов). Пишется справочно;
  - экстраполяция с полом min_wall.
"""
import numpy as np
import pandas as pd

YEAR = pd.Timedelta(days=365.25)


def segment_rates(prev_min, pred, wt_nom, horizon_years, age_years):
    """Краткосрочная, долгосрочная и итоговая (долгосрочная, ≥ 0) скорость, мм/год."""
    prev_min, pred, wt_nom = (np.asarray(a, float) for a in (prev_min, pred, wt_nom))
    short = (prev_min - pred) / max(horizon_years, 1e-6)
    long_ = (wt_nom - pred) / max(age_years, 1e-6)
    return short, long_, np.maximum(long_, 0.0)


def degradation_curve(df: pd.DataFrame, date_in, date_prev, date_pred,
                      years_ahead=(1, 2, 5, 10), min_wall: float = 0.5) -> pd.DataFrame:
    """Длинная таблица (id, segment_id, date, thickness, kind) по сегментам одной трубы.

    df: segment_id, thickness_pred, wt_nom и (если есть прошлый ВТД) prev_min.
    date_prev=None — прошлого ВТД нет (кейс 2: ввод -> прогноз).
    """
    date_in, date_pred = pd.Timestamp(date_in), pd.Timestamp(date_pred)
    pred, wt = df["thickness_pred"].values, df["wt_nom"].values
    age = (date_pred - date_in) / YEAR
    if date_prev is not None:
        date_prev = pd.Timestamp(date_prev)
        prev = df["prev_min"].values
        short, _, rate = segment_rates(prev, pred, wt, (date_pred - date_prev) / YEAR, age)
        anchors = [(date_in, wt, "ввод"), (date_prev, np.maximum(prev, pred), "ВТД")]
    else:
        rate = np.maximum((wt - pred) / max(age, 1e-6), 0.0)
        short = np.full(len(df), np.nan)
        anchors = [(date_in, wt, "ввод")]
    anchors.append((date_pred, pred, "прогноз"))
    for k in years_ahead:
        anchors.append((date_pred + k * YEAR, np.maximum(pred - rate * k, min_wall),
                        f"+{k} г"))
    parts = [pd.DataFrame({"id": df["id"].values, "segment_id": df["segment_id"].values,
                           "date": d.date(), "thickness": np.round(v, 3), "kind": k})
             for d, v, k in anchors]
    out = pd.concat(parts, ignore_index=True)
    out["rate_mm_y"] = np.tile(np.round(rate, 4), len(anchors))
    out["rate_short_mm_y"] = np.tile(np.round(short, 4), len(anchors))
    return out


def check_monotone(curve: pd.DataFrame) -> int:
    """Число сегментов, где толщина где-то растёт по времени (должно быть 0)."""
    c = curve.sort_values(["id", "segment_id", "date"])
    inc = c.groupby(["id", "segment_id"])["thickness"].diff() > 1e-9
    return int(c.loc[inc, ["id", "segment_id"]].drop_duplicates().shape[0])
