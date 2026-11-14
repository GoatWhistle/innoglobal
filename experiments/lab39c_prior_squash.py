"""Лаборатория, серия 39c (кейс 2): сжатие верха профиля 9583 у номинала.

Проблема (интегратор): у 9583 ~55% сегментов в 4.49-4.50 мм — визуально полка.
Причина: форма 9583 = приор −P (бустинг там константа), а P — сигмоида: у низинной
половины трубы P≈0 и −P насыщается; калибровка (p99 = номинал) ставит этот
насыщенный хвост вплотную к номиналу. Варианты:
  P/p99   — текущий (бленд z(ens)+0.5·z(−P), якорь p99 = номинал);
  L/p99   — в бленд идёт логит P (линейный предиктор логрега, без насыщения);
  P/max, L/max — якорь «максимум = номинал» вместо p99 (масштаб; r² не меняется).
Метрики: V1/V2/V3 r² и MAE, профиль 9583 (доля сегментов в 0.01 мм от максимума,
квантили, средняя потеря за 29 лет).

ИТОГ (детерминировано; 9583 — финальная модель train+val):
  вариант  V1 r2/MAE      V2 r2/MAE      V3 r2/MAE      9583: доля в 0.01 от верха, квантили 0/10/50/90/100
  P/p99    0.1946/0.815   0.0480/0.866   0.0094/0.071   54%  [3.742 4.199 4.491 4.499 4.500]
  L/p99    0.2003/0.797   0.0489/0.862   0.0090/0.072   12%  [4.136 4.267 4.460 4.492 4.500]
  P/max    0.1946/0.805   0.0480/0.859   0.0094/0.071   13%  [3.802 4.217 4.484 4.491 4.500]
  L/max    0.2003/0.789   0.0489/0.856   0.0090/0.072   0.4% [4.302 4.353 4.428 4.440 4.500]  (принят)
Принято L/max: V1 +0.006 r² и −0.026 MAE, V2 +0.001/−0.010, V3 r² −0.0004 (шум, 4 трубы).
9583: полка у номинала ушла, потеря в среднем 0.093 мм за 29 лет (0.0032 мм/год = аналоги ЦППН),
мин. 4.30. Остаток: вторая половина трубы (z 51.7-56.5 м, σ 1.4 м — плоская низина) почти
однородна (4.42-4.44): рельефу там нечего различать, бустинг на 9583 — константа; это честный
ответ модели, а не артефакт клипа (до номинала 0.06 мм, клипа нет). Первая, холмистая половина
тоньше (среднее 4.38) — выше и на подъёмах, как на трубах ЦППН и 22871.
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import c2lab as L  # noqa: E402
from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import train as T  # noqa: E402
from pipetwin.prepare import load_passport  # noqa: E402

DIR = dict(load_passport()[["id", "direction"]].itertuples(index=False))


def shape(ens, tr, va, use_logit, anchor):
    cfg = T.CASES["case2"]
    prior = T.fit_relief_prior(tr[tr["id"].map(DIR) == DIR[cfg["prior_pipe"]]])
    X = va[F.PRIOR_FEATS].fillna(0.0)
    s = prior.decision_function(X) if use_logit else prior.predict_proba(X)[:, 1]
    base = T.prior_blend(ens, s, cfg["prior_w"])
    nom, age = float(va["wt_nom"].iloc[0]), float(va["age_end"].iloc[0])
    rates = T.analog_rates(tr, DIR[int(va["id"].iloc[0])], DIR)
    m_t = nom - float(np.mean(rates)) * age
    hi = float(np.max(base)) if anchor == "max" else float(np.quantile(base, 0.99))
    mu = float(np.mean(base))
    b = max((nom - m_t) / (hi - mu), 0.0) if hi - mu > 1e-9 else 0.0
    return m_t + b * (base - mu)


VARIANTS = {"P/p99": (False, "p99"), "L/p99": (True, "p99"),
            "P/max": (False, "max"), "L/max": (True, "max")}


def main():
    ds, sub, feats = L.load()
    sp = L.splits(ds, sub)
    ens_cache = {}
    rows = []
    for name, (lg, anc) in VARIANTS.items():
        res = {}
        for s, pairs in sp.items():
            r2s, maes = [], []
            for i, (tr, va) in enumerate(pairs):
                if (s, i) not in ens_cache:
                    ens_cache[(s, i)] = L.ref_predict(tr, va, feats)
                p = shape(ens_cache[(s, i)], tr, va, lg, anc)
                r2s.append(L.r2(va["y"], p))
                maes.append(L.mae(va["y"], p))
            res[f"{s}_r2"], res[f"{s}_mae"] = np.mean(r2s), np.mean(maes)
        allp = sub[sub["split"].isin(["train", "val_case2"])]
        pr = pd.read_csv(C.PROCESSED_DIR / "predict_dataset.csv", parse_dates=["start", "end"])
        g = pr[pr["id"] == C.CASE2_ID]
        if "dep_ens" not in ens_cache:
            ens_cache["dep_ens"] = L.ref_predict(allp, g, feats)
        p = np.clip(shape(ens_cache["dep_ens"], allp, g, lg, anc), 0.5, 4.5)
        res["9583_near_top"] = float(np.mean(p >= p.max() - 0.01))
        res["9583_in_4.49"] = float(np.mean(p >= 4.49))
        res["9583_q"] = np.round(np.quantile(p, [0, .1, .5, .9, 1]), 3).tolist()
        res["9583_loss_mean"] = round(4.5 - float(np.mean(p)), 3)
        rows.append(dict(variant=name, **res))
        print(name, {k: (round(v, 4) if isinstance(v, float) else v) for k, v in res.items()},
              flush=True)
        np.save(Path(__file__).resolve().parents[1] / "logs" / f"lab39c_{name.replace('/', '_')}.npy", p)
    print(pd.DataFrame(rows).round(4).to_string())


if __name__ == "__main__":
    main()
