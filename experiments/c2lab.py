"""Общий стенд лабораторий кейса 2 (lab35-39): три валидации и метрики.

V1 official — путь train.run: обучение на парах «ввод→ВТД» train, оценка на
   22871 ввод-2000→ВТД-2018 (525 сегментов). В обучении остаётся пара 22871
   ввод→2022 той же трубы: модель видит пространственную карту дефектов этой
   трубы с другого пропуска (по dist_m/z/slope запоминается позиция) — у целевой
   трубы 9583 такого нет вовсе.
V2 strict — PIPETWIN_VAL2_STRICT=1: та же оценка, но труба 22871 целиком
   исключена из обучения (как у 9583 — ни одного своего пропуска).
V3 ЦППН-LOPO — направление ДНС-1→ЦППН-1, где лежит и 9583 (нефть товарная,
   обводнённость 0-0.46%): каждую крупную трубу направления по очереди убираем
   из обучения и прогнозируем её ввод-2011→ВТД-2023. Труба 9584 — прямое
   продолжение 9583 (тот же УЗ-3, та же обводнённость/расход). Таргет почти
   константа с редкими ямами (2-8% сегментов с дефектом) — как, вероятно, и у 9583.
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import train as T  # noqa: E402

CPPN_VAL = (1250009584, 1250028934, 1250028932, 1250028935)
KUST1 = (1250009490, 1250022871, 1250011604)
SEEDS3 = (42, 7, 2024)


def load():
    ds = pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv", parse_dates=["start", "end"])
    ds = T.survival_labels(ds)
    feats = F.case_features(ds, "case2")
    sub = ds[ds["kind"] == "comm2vtd"]
    return ds, sub, feats


def splits(ds, sub):
    """-> dict name -> list of (tr, va) пар (V3 — по трубе)."""
    tr = sub[sub["split"] == "train"]
    va = ds[ds["split"] == "val_case2"]
    out = {"V1": [(tr, va)],
           "V2": [(tr[~tr["id"].isin(va["id"].unique())], va)]}
    out["V3"] = [(tr[tr["id"] != pid], tr[tr["id"] == pid]) for pid in CPPN_VAL]
    return out


def r2(y, p):
    return T.pearson_r2(np.asarray(y), np.asarray(p))


def mae(y, p):
    return float(np.mean(np.abs(np.asarray(y) - np.asarray(p))))


def ref_predict(tr, va, feats, grid=T.PARAM_GRID):
    """Референс кейса 2: LGBM по сетке PARAM_GRID (как train.run)."""
    bag = [m for p in grid for m in T.fit_bag(
        tr[feats], tr["y"], tr["aft_lb"].values, tr["aft_ub"].values, p, None,
        families=("lgbm",), seeds=(42,))]
    return T.predict_bag(bag, va[feats], va["wt_nom"].values)["ensemble"]


def evaluate(pred_fn, ds, sub, feats, which=("V1", "V2", "V3"), verbose=True):
    """pred_fn(tr, va, feats) -> прогноз. Возвращает dict метрик."""
    res = {}
    for name, pairs in splits(ds, sub).items():
        if name not in which:
            continue
        r2s, maes = [], []
        for tr, va in pairs:
            p = pred_fn(tr, va, feats)
            r2s.append(r2(va["y"], p))
            maes.append(mae(va["y"], p))
        res[f"{name}_r2"] = float(np.mean(r2s))
        res[f"{name}_mae"] = float(np.mean(maes))
        if name == "V3":
            res["V3_each"] = [round(x, 4) for x in r2s]
        if verbose:
            print(f"  {name}: r2 {res[f'{name}_r2']:.4f} mae {res[f'{name}_mae']:.3f}"
                  + (f" each {res['V3_each']}" if name == "V3" else ""), flush=True)
    return res


def deploy_profile(pred_fn, ds, sub, feats):
    """Профиль целевой трубы 9583 моделью, обученной как финальная (train + val кейса 2).

    Возвращает (сырой прогноз, после сдвига predict.py p99 -> номинал и клипа)."""
    import pandas as pd
    allp = sub[sub["split"].isin(["train", "val_case2"])]
    pr = pd.read_csv(C.PROCESSED_DIR / "predict_dataset.csv", parse_dates=["start", "end"])
    g = pr[pr["id"] == C.CASE2_ID].copy()
    g["y"] = np.nan
    raw = np.asarray(pred_fn(allp, g, feats), dtype=float)
    nom = float(g["wt_nom"].iloc[0])
    shift = max(0.0, float(np.quantile(raw, 0.99)) - nom)
    return raw, np.clip(raw - shift, 0.5, nom)


def describe(p, tag=""):
    v, c = np.unique(np.round(p, 3), return_counts=True)
    q = np.round(np.quantile(p, [0, .1, .25, .5, .75, .9, 1]), 3)
    print(f"  {tag} q={q.tolist()} top={v[c.argmax()]}x{c.max() / len(p):.2f}", flush=True)
