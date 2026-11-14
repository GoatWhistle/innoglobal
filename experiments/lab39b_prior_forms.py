"""Лаборатория, серия 39b (кейс 2): форма рельефного приора.

У 9583 бустинг — константа, и весь профиль = приор (lab39), поэтому его качество
меряется напрямую: V3 (LOPO по 4 трубам ЦППН, режим 9583) — AUC had_defect и Пирсон
r²(y, −P); перенос на 22871 ввод→2018 (другой режим; ЦППН-приор её не видел).
Варианты: логрег C=0.1 (принят в lab39), сплайны по признакам (нелинейность
«дно/склон/гребень»), полиномы 2-й степени, balanced-веса, ridge на потере металла,
малый LGBM-классификатор с монотонностью не задаётся (lab39: хуже).

ИТОГ (V3: среднее по 4 трубам ЦППН; перенос — 22871 ввод→2018):
  вариант              V3 AUC (min)    V3 r²    22871 AUC / r²
  logit C0.1 (принят)  0.612 (0.499)   0.0094   0.576 / 0.025
  logit balanced       0.611 (0.476)   0.0108   0.570 / 0.024
  spline k4 C0.03      0.632 (0.613)   0.0050   0.558 / 0.013
  spline k4 C0.1       0.618 (0.599)   0.0041   0.550 / 0.013
  poly2 C0.01          0.488 (0.441)   0.0033   0.618 / 0.040
  ridge на потере      0.590 (0.466)   0.0068   0.541 / 0.011
Оставлен линейный логрег: лучший V3 r² при хорошем переносе. Сплайны ровнее по AUC
(ни одной трубы ниже 0.6), но ранжируют хуже глубину (r² вдвое ниже); poly2 переобучается
на ЦППН (V3 AUC < 0.5), перенос на 22871 — случайный выброс. balanced — в пределах шума.
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import roc_auc_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures, SplineTransformer, StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parent))
import c2lab as L  # noqa: E402
from pipetwin import features as F  # noqa: E402

CPPN = (1250009584, 1250009587, 1250028931, 1250028932, 1250028933, 1250028934,
        1250028935)


class RegAsClf:
    def __init__(self, m):
        self.m = m

    def fit(self, X, y_loss):
        self.m.fit(X, y_loss)
        return self

    def predict_proba(self, X):
        p = self.m.predict(X)
        return np.column_stack([-p, p])


VARIANTS = {
    "logit C0.1 (принят)": lambda: make_pipeline(StandardScaler(),
                                                 LogisticRegression(C=0.1, max_iter=3000)),
    "logit balanced": lambda: make_pipeline(StandardScaler(), LogisticRegression(
        C=0.1, max_iter=3000, class_weight="balanced")),
    "spline k4 C0.03": lambda: make_pipeline(StandardScaler(), SplineTransformer(
        n_knots=4, degree=2), LogisticRegression(C=0.03, max_iter=3000)),
    "spline k4 C0.1": lambda: make_pipeline(StandardScaler(), SplineTransformer(
        n_knots=4, degree=2), LogisticRegression(C=0.1, max_iter=3000)),
    "poly2 C0.01": lambda: make_pipeline(StandardScaler(), PolynomialFeatures(2),
                                         StandardScaler(),
                                         LogisticRegression(C=0.01, max_iter=3000)),
    "ridge loss": "ridge",
}


def fit(name, tr):
    X = tr[F.PRIOR_FEATS].fillna(0.0)
    if VARIANTS[name] == "ridge":
        return RegAsClf(make_pipeline(StandardScaler(), Ridge(alpha=30.0))).fit(
            X, (tr["wt_nom"] - tr["y"]).values)
    return VARIANTS[name]().fit(X, tr["had_defect"].astype(int))


def main():
    ds, sub, feats = L.load()
    cp = sub[sub["id"].isin(CPPN)]
    va22 = ds[ds["split"] == "val_case2"]
    rows = []
    for name in VARIANTS:
        aucs, r2s = [], []
        for pid in L.CPPN_VAL:
            tr, va = cp[cp["id"] != pid], cp[cp["id"] == pid]
            p = fit(name, tr).predict_proba(va[F.PRIOR_FEATS].fillna(0.0))[:, 1]
            aucs.append(roc_auc_score(va["had_defect"], p))
            r2s.append(L.r2(va["y"], -p))
        p = fit(name, cp).predict_proba(va22[F.PRIOR_FEATS].fillna(0.0))[:, 1]
        rows.append(dict(variant=name, V3_auc=np.mean(aucs), V3_auc_min=np.min(aucs),
                         V3_r2=np.mean(r2s), auc_22871=roc_auc_score(va22["had_defect"], p),
                         r2_22871=L.r2(va22["y"], -p),
                         each=[round(a, 3) for a in aucs]))
        print(rows[-1], flush=True)
    print(pd.DataFrame(rows).round(4).to_string())


if __name__ == "__main__":
    main()
