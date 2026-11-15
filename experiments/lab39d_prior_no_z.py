"""Лаборатория, серия 39d (кейс 2): рельефный приор без абсолютно-высотных признаков.

Подозрение: у 9583 вторая половина (плоская глобальная низина, z 51.7-56.5 м) лежит у номинала
не из-за отсутствия карманов, а из-за z_rel (z − среднее по трубе, коэф. +0.42): из разницы
логитов половин −2.47 на z_rel приходится −1.80. Это «выше на трубе = больше дефектов» —
против физики (вода оседает в низинах) и похоже на идентификатор позиции, как z в бустинге.
Варианты PRIOR_FEATS (бленд L/max как в lab39c):
  full     — текущий;
  -z_rel   — без z_rel;
  -z_all   — без z_rel, z_rank, z_norm (остаются локальные: lowness, sag, pocket, climb ...).
Метрики: V1/V2/V3 r² и MAE (бленд), AUC приора на валидации V1 (had_defect 22871),
профиль 9583 (std половин, логит по половинам, квантили).
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

sys.path.insert(0, str(Path(__file__).resolve().parent))
import c2lab as L  # noqa: E402
from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import train as T  # noqa: E402
from pipetwin.prepare import load_passport  # noqa: E402

DIR = dict(load_passport()[["id", "direction"]].itertuples(index=False))
FULL = list(F.PRIOR_FEATS)
VARIANTS = {"full": FULL,
            "-z_rel": [f for f in FULL if f != "z_rel"],
            "-z_all": [f for f in FULL if f not in ("z_rel", "z_rank", "z_norm")]}


def fit_prior(tr):
    cfg = T.CASES["case2"]
    return T.fit_relief_prior(tr[tr["id"].map(DIR) == DIR[cfg["prior_pipe"]]])


def shape(ens, tr, va):
    cfg = T.CASES["case2"]
    s = fit_prior(tr).decision_function(va[F.PRIOR_FEATS].fillna(0.0))
    base = T.prior_blend(ens, s, cfg["prior_w"])
    return T.calibrate_level(base, float(va["wt_nom"].iloc[0]), float(va["age_end"].iloc[0]),
                             T.analog_rates(tr, DIR[int(va["id"].iloc[0])], DIR)), s


def main():
    ds, sub, feats = L.load()
    sp = L.splits(ds, sub)
    ens_cache = {}
    pr = pd.read_csv(C.PROCESSED_DIR / "predict_dataset.csv", parse_dates=["start", "end"])
    g = pr[pr["id"] == C.CASE2_ID].sort_values("segment_id")
    far = (g["segment_id"].to_numpy() * C.SEGMENT_LEN if hasattr(C, "SEGMENT_LEN")
           else g["segment_id"].to_numpy() * 10.0) >= 6600
    allp = sub[sub["split"].isin(["train", "val_case2"])]
    rows = []
    for name, pf in VARIANTS.items():
        F.PRIOR_FEATS = pf
        res = {}
        for s, pairs in sp.items():
            r2s, maes, aucs = [], [], []
            for i, (tr, va) in enumerate(pairs):
                if (s, i) not in ens_cache:
                    ens_cache[(s, i)] = L.ref_predict(tr, va, feats)
                p, lg = shape(ens_cache[(s, i)], tr, va)
                r2s.append(L.r2(va["y"], p))
                maes.append(L.mae(va["y"], p))
                hd = va["had_defect"].astype(int)
                if hd.nunique() == 2:
                    aucs.append(roc_auc_score(hd, lg))
            res[f"{s}_r2"], res[f"{s}_mae"] = np.mean(r2s), np.mean(maes)
            res[f"{s}_auc"] = np.mean(aucs) if aucs else np.nan
        if "dep" not in ens_cache:
            ens_cache["dep"] = L.ref_predict(allp, g, feats)
        p, lg = shape(ens_cache["dep"], allp, g)
        p = np.clip(p, 0.5, 4.5)
        res["9583_near_mean"] = round(float(p[~far].mean()), 3)
        res["9583_far_mean"] = round(float(p[far].mean()), 3)
        res["9583_near_std"] = round(float(p[~far].std()), 4)
        res["9583_far_std"] = round(float(p[far].std()), 4)
        res["9583_q"] = np.round(np.quantile(p, [0, .1, .5, .9, 1]), 3).tolist()
        m = fit_prior(allp)
        coef = dict(zip(pf, m[-1].coef_[0].round(3)))
        res["top_coef"] = sorted(coef.items(), key=lambda kv: -abs(kv[1]))[:6]
        rows.append(dict(variant=name, **res))
        print(name, {k: (round(v, 4) if isinstance(v, float) else v) for k, v in res.items()},
              flush=True)
        np.save(Path(C.PROCESSED_DIR).parent.parent / "logs" / f"lab39d_{name}.npy", p)
    F.PRIOR_FEATS = FULL
    print(pd.DataFrame(rows).drop(columns=["top_coef", "9583_q"]).round(4).to_string())


if __name__ == "__main__":
    main()

# ИТОГ (детерминировано; 9583 — финальная модель train+val), 2026-11-15:
#   вариант  V1 r2/MAE      V2 r2/MAE      V3 r2/MAE      AUC V1/V3      9583 <6.6 / >=6.6 км (std)
#   full     0.2003/0.789   0.0489/0.856   0.0090/0.072   0.576/0.612    4.375 / 4.434 (0.032/0.005)
#   -z_rel   0.1895/0.797   0.0439/0.861   0.0049/0.072   0.567/0.590    4.386 / 4.425 (0.035/0.005)
#   -z_all   0.1959/0.790   0.0409/0.859   0.0030/0.073   0.505/0.552    4.400 / 4.413 (0.027/0.003)
# Отвергнуто: хуже на V1/V2/V3. Без высотных признаков приор на чужой 22871 случаен (AUC 0.505) —
# переносимый сигнал приора в высоте («выше по трубе / на подъёме = дефект»), это не ID трубы.
# Ровная полка после 6.6 км остаётся при любом наборе (плоская низина); z_rel задаёт лишь её уровень.
