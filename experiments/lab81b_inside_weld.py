"""Лаборатория 81b: композиция сдвига внутри трубы (lab71) на швах вместо окон match.

Симуляция геометрии 22871 на 1250011604: сдвиг 2022 -> 2023 известен только на концах.
Истина — цепочка швов 2022 -> 2023 (weld; точнее окон match: скачок +4.6 м у 338 м локализован
до шва, match размазывает его по окну 60 м). Методы: line (прямая по концам), prod-match
(align.inside_dev на окнах match, как сейчас), prod-weld (то же на цепочке швов 2018 -> 2022),
oracle-match / oracle-weld (весь сдвиг известен). Метрики: ошибка сдвига, r²/r2d quant и
aligned_stats на 50 сегментах 11604 (val_case1, оракульный режим dev).
Запуск: python experiments/lab81b_inside_weld.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from pipetwin import align as A  # noqa: E402
from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import prepare  # noqa: E402
from pipetwin import train as T  # noqa: E402

PID = 1250011604
R18, R22, R23 = (pd.Timestamp(d) for d in ("2018-09-23", "2022-07-06", "2023-12-01"))
YEAR = pd.Timedelta(days=365.25)


def pts(vtd, a, b, m):
    p = A.window_shifts(vtd, PID, a, b, m)
    return np.array([q[0] for q in p]), np.array([q[1] for q in p])


def line_ends(x, y, k=1):
    """Прямая через концы (медианы k крайних точек)."""
    o = np.argsort(x)
    x, y = x[o], y[o]
    x0, x1, y0, y1 = x[:k].mean(), x[-k:].mean(), np.median(y[:k]), np.median(y[-k:])
    return lambda d: y0 + (y1 - y0) * (np.asarray(d, float) - x0) / (x1 - x0)


def main():
    passport = prepare.load_passport()
    nseg = prepare.n_segments(prepare.load_altitudes())
    vtd = prepare.load_vtd()
    runs = prepare.build_runs(vtd)
    xm, sm = pts(vtd, R22, R23, "match")
    xw, sw = pts(vtd, R22, R23, "weld")
    truth = A._interp(xw, sw)
    lin = line_ends(xm, sm)  # концы — как у прогноза (окна соседей)
    meth = {"oracle-weld": truth, "oracle-match": A._interp(xm, sm), "line": lin}
    for m in ("match", "weld"):
        A.INSIDE_METHOD = m
        A._cache.clear()
        dev = A.inside_dev(vtd, PID, R18, R22)
        meth[f"prod-{m}"] = (lambda d, dev=dev: lin(d) - dev(d))
    xs = np.arange(0, 490, 5.0)
    for m, f in meth.items():
        err = f(xs) - truth(xs)
        print(f"{m:13s} ошибка сдвига к weld-истине: RMSE {np.sqrt(np.mean(err ** 2)):.2f} м, max {np.abs(err).max():.2f}")
    ds = pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv", parse_dates=["start", "end"])
    va = ds[(ds["split"] == "val_case1") & (ds["id"] == PID)].sort_values("segment_id")
    y, hd = va["y"].values, va["had_defect"].values.astype(bool)
    age = (R22 - passport.set_index("id").loc[PID, "date_in"]) / YEAR
    rows = []
    for m, f in meth.items():
        for dlt in np.round(np.arange(-1.0, 1.01, 0.1), 2):
            sv = A.shifted_vtd(vtd, PID, R22, (lambda d, f=f, dlt=dlt: f(d) + dlt), int(nseg.loc[PID]))
            st = F.start_state_features(sv, runs, nseg, passport, PID, R22, "vtd2vtd", age)
            st = va[["segment_id"]].merge(st, on="segment_id", how="left")
            for kind, sc in (("quant", T.quant_score(st)), ("stats", T.aligned_stats_score(st))):
                rows.append(dict(method=m, d=dlt, score=kind, r2=T.pearson_r2(y, sc),
                                 r2d=T.pearson_r2(y[hd], sc[hd])))
    df = pd.DataFrame(rows)
    pd.set_option("display.width", 220)
    for v in ("r2", "r2d"):
        pv = df.pivot_table(index="method", columns=["score", "d"], values=v)
        print(v, "по δ:")
        print(pv.xs("quant", axis=1, level=0).round(2).to_string())
        out = pd.DataFrame({
            f"{k} mean|δ|<=1": pv.xs(k, axis=1, level=0).mean(axis=1) for k in ("quant", "stats")})
        for k in ("quant", "stats"):
            q = pv.xs(k, axis=1, level=0)
            out[f"{k} mean|δ|<=0.5"] = q.loc[:, [c for c in q.columns if abs(c) <= 0.5]].mean(axis=1)
        print(out.round(3).to_string())

if __name__ == "__main__":
    main()

# ИТОГ (1250011604, истина — швы 2022 -> 2023): ошибка сдвига line 1.88 м, prod-match 0.71 (max 2.06),
# prod-weld 0.24 (max 0.36). r² quant: oracle-weld 0.765 при δ=0, 0.65 при δ=+0.1 м (у 34 из 50
# сегментов меняются prev_*; решают чистые 36-37) — валидация не различает точность < 0.5 м.
# Среднее по δ ∈ [−1, 1]: prod-match 0.738, prod-weld 0.683 (сторона порога, не точность).
