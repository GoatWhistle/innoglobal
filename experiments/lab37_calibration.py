"""Лаборатория, серия 37 (кейс 2): калибровка уровня/масштаба прогноза под MAE.

Пирсон к положительному аффинному преобразованию инвариантен, так что r² не
меняется, меняются MAE/RMSE/MAPE и физичность. Правило калибровки обязано быть
применимо к 9583 без её ВТД: опирается только на «аналоги» — обучающие пары
ввод→ВТД того же направления (для 22871 — Куст-1, для 9583 и труб V3 — ЦППН).
Физика: толщина = номинал − скорость потери (мм/год аналогов) × возраст.

Правила:
  R0 raw         — как сейчас на валидации (без сдвига);
  R1 deploy      — правило predict.py: p99 -> номинал, только если выше;
  R2 med         — сдвиг: медиана прогноза = номинал − медианная скорость аналогов × возраст;
  R3 mean+p99    — аффинно по двум якорям: среднее = номинал − средняя скорость аналогов ×
                   возраст, p99 = номинал (верх профиля — нетронутая стенка);
  R4 mean        — только сдвиг среднего к уровню аналогов (масштаб сырой);
  QM quantile    — квантильное отображение рангов прогноза на распределение аналогов
                   (масштаб по возрасту); монотонно, НЕ аффинно — r² меняется.

ИТОГ (база — референс LGBM-сетка; r²/MAE/RMSE):
  правило   V1                    V2                    V3 (ЦППН-LOPO)
  R0 raw    0.1813/0.861/1.066    0.0098/0.936/1.157    0.0075/0.062/0.210
  R1 deploy 0.1813/0.861/1.066    0.0098/0.936/1.157    0.0075/0.101/0.218
  R2 med    0.1813/0.812/0.944    0.0098/0.889/1.048    0.0075/0.062/0.210
  R4 mean   0.1813/0.813/0.951    0.0098/0.886/1.024    0.0075/0.097/0.198
  R3 2якоря 0.1813/0.818/1.014    0.0098/0.922/1.109    0.0075/0.073/0.185
  QM        0.1434/0.800/0.978    0.0091/0.958/1.204    0.0000/0.038/0.187
Оракул (LAD-аффинная подгонка на самой валидации V1) — MAE 0.808: R2 (0.812) почти
в потолке. Принято R2 — сдвиг медианы к «номинал − медианная скорость аналогов ×
возраст»: MAE −0.049 на V1 и −0.047 на V2, V3 без изменений, r² инвариантен; правило
не смотрит на таргет валидации. QM бьёт MAE на V1, но не аффинно и роняет r² — отказ.
НО на 9583 у референсной модели R2 даёт константу 4.5 (медиана аналогов ЦППН = 0 потери,
84% сегментов на полке, остальные выше полки → клип номиналом): r² = 0. Правило
работает только с моделью, у которой полка 9583 — верх профиля (см. lab36).
"""
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import c2lab as L  # noqa: E402

DIRECTION = {}  # id -> направление, заполняется в main


def analog_rates(tr, pipe_id):
    d = DIRECTION[pipe_id]
    a = tr[tr["id"].map(DIRECTION) == d]
    if a.empty:
        a = tr
    return ((a["wt_nom"] - a["y"]) / a["age_end"]).values


def calibrate(p, va, tr, rule):
    pid = int(va["id"].iloc[0])
    nom, age = float(va["wt_nom"].iloc[0]), float(va["age_end"].iloc[0])
    rates = analog_rates(tr, pid)
    if rule == "R0":
        return p
    if rule == "R1":
        return p - max(0.0, np.quantile(p, 0.99) - nom)
    if rule == "R2":
        return p - np.median(p) + nom - np.median(rates) * age
    if rule == "R4":
        return p - np.mean(p) + nom - np.mean(rates) * age
    if rule == "R3":
        m_t = nom - np.mean(rates) * age
        hi, mu = np.quantile(p, 0.99), np.mean(p)
        b = (nom - m_t) / (hi - mu) if hi - mu > 1e-9 else 0.0
        return m_t + b * (p - mu)
    if rule == "QM":
        tq = nom - np.sort(rates) * age  # распределение толщин аналогов в возрасте цели
        ranks = pd.Series(p).rank(pct=True).values
        return np.quantile(tq, ranks)
    raise ValueError(rule)


RULES = ("R0", "R1", "R2", "R4", "R3", "QM")


def main():
    ds, sub, feats = L.load()
    pas = ds.groupby("id")["id"].first()
    import duckdb
    from pipetwin import config as C
    with duckdb.connect(str(C.WAREHOUSE_DB), read_only=True) as con:
        d = con.execute("select pipe_id, direction from core.pipe").df()
    DIRECTION.update(dict(zip(d["pipe_id"], d["direction"])))
    del pas
    t = time.time()
    rows = []
    for name, pairs in L.splits(ds, sub).items():
        for tr, va in pairs:
            p = L.ref_predict(tr, va, feats)
            y = va["y"].values
            for rule in RULES:
                q = calibrate(p, va, tr, rule)
                rows.append(dict(split=name, pipe=int(va["id"].iloc[0]), rule=rule,
                                 r2=L.r2(y, q), mae=L.mae(y, q),
                                 rmse=float(np.sqrt(np.mean((y - q) ** 2)))))
            print(name, int(va["id"].iloc[0]), f"{time.time() - t:.0f}s", flush=True)
    df = pd.DataFrame(rows)
    print(df.groupby(["split", "rule"])[["r2", "mae", "rmse"]].mean().round(4).to_string())
    # прогноз 9583 по правилам (финальная модель: train + val)
    allp = sub[sub["split"].isin(["train", "val_case2"])]
    pr = pd.read_csv(C.PROCESSED_DIR / "predict_dataset.csv", parse_dates=["start", "end"])
    g = pr[pr["id"] == C.CASE2_ID]
    p = L.ref_predict(allp, g, feats)
    print("9583 аналоги: средняя скорость", np.mean(analog_rates(allp, C.CASE2_ID)).round(5),
          "медиана", np.median(analog_rates(allp, C.CASE2_ID)).round(5))
    for rule in RULES:
        q = np.clip(calibrate(p, g, allp, rule), 0.5, 4.5)
        L.describe(q, f"9583 {rule}")


if __name__ == "__main__":
    main()
