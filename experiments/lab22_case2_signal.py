"""Лаборатория, серия 22: есть ли в данных сигнал для кейса 2 (9583, ДНС-1 -> ЦППН-1, сухая нефть).

Проблема: валидация кейса 2 — 22871 «ввод -> 2018» (обводнённая нитка Куст-1, другой режим), и та же
труба сидит в обучении парой «ввод -> 2022»; строгая проверка (PIPETWIN_VAL2_STRICT=1) даёт 0.016.
Режимно похожие данные — 7 участков ДНС-1 -> ЦППН-1 с ВТД 2023 (2 185 сегментов, 94 с дефектами).

Протокол: leave-one-pipe-out по этим 7 участкам (обучение на всех парах «ввод -> ВТД», кроме своих)
+ строгая 22871 (обучение без всех пар 22871). r² Пирсона внутри каждой трубы, среднее по трубам —
так, как будет на одной трубе 9583. Для сравнения — эвристики рельефа и случайный шум.

Результаты (2026-11-14):
  - в ВТД 2023 на ДНС-1 -> ЦППН-1 внутренней коррозии нет совсем: 85% сегментов с дефектами — производственные
    дефекты, остальное — наружная коррозия; автокорреляция дефектности соседних сегментов ~0;
  - AUC признаков рельефа внутри трубы 0.44-0.54 (пул-AUC высоты 0.64 — только межтрубный уровень);
  - r² внутри труб: LGBM кейса 2 0.003, LGBM на рельефе 0.002, эвристики 0.004-0.014, случайный шум 0.017;
    строгая 22871: 0.011-0.044 у всех, шум 0.001.
Вывод: проверяемого сигнала для кейса 2 нет; 0.19 в validation_report — утечка через 22871 «ввод -> 2022».
Модель кейса 2 не меняем: альтернативы не лучше шума, а смена переписала бы сданный профиль.
Запуск: python experiments/lab22_case2_signal.py   (после python run_all.py — нужен train_dataset.csv)
"""
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
warnings.filterwarnings("ignore")

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import train as T  # noqa: E402

DC = [1250009584, 1250009587, 1250028931, 1250028932, 1250028933, 1250028934, 1250028935]
GEO = ["z", "slope", "lowness_250m", "lowness_1km", "z_rel", "water_trap", "pocket_depth",
       "climb_len", "climb_rise", "climb_pos", "rise_500m", "dist_frac"]

ds = pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv", parse_dates=["start", "end"])
c2 = ds[ds["kind"] == "comm2vtd"].copy()
feats = F.case_features(ds, "case2")


def auc(t, s):
    s = s.astype(float).fillna(s.median())
    return roc_auc_score(t, s) if t.nunique() == 2 and s.std() > 0 else np.nan


x = c2[c2["id"].isin(DC)]
print(f"ДНС-1 -> ЦППН-1: {len(x)} сегментов, {int(x['had_defect'].sum())} с дефектами")
print("AUC признака для «есть дефект» (пул / внутри трубы):")
for f in GEO:
    within = np.nanmean([auc(g["had_defect"], g[f]) for _, g in x.groupby("id")])
    print(f"  {f:14s} {auc(x['had_defect'], x[f]):.3f} / {within:.3f}")


def lgbm(tr, te, cols):
    return np.mean([T.make_model("lgbm", dict(p["lgbm"])).fit(tr[cols], tr["y"]).predict(te[cols])
                    for p in T.PARAM_GRID[:3]], axis=0)


rng = np.random.default_rng(C.SEED)
CANDIDATES = {
    "LGBM кейса 2 (как сейчас)": lambda tr, te: lgbm(tr, te, feats),
    "LGBM только рельеф": lambda tr, te: lgbm(tr, te, GEO),
    **{f"эвристика −{f}": (lambda tr, te, f=f: -te[f].fillna(te[f].median()).to_numpy())
       for f in ("z", "lowness_250m", "pocket_depth", "dist_frac")},
    "случайный шум": lambda tr, te: rng.normal(size=len(te)),
}
print("\nr² внутри труб ДНС-1 -> ЦППН-1 (LOPO, среднее) | строгая 22871 «ввод -> 2018»:")
for name, fn in CANDIDATES.items():
    per = []
    for pid in DC:
        te, tr = c2[c2["id"] == pid], c2[c2["id"] != pid]
        per.append(T.pearson_r2(te["y"].to_numpy(), fn(tr, te)))
    te = c2[(c2["id"] == 1250022871) & (c2["end"] == pd.Timestamp("2018-09-23"))]
    s22 = T.pearson_r2(te["y"].to_numpy(), fn(c2[c2["id"] != 1250022871], te))
    print(f"  {name:28s} {np.mean(per):.4f} | {s22:.4f}")
