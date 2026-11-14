"""Лаборатория 71: оценка сдвига прошлого пропуска ВНУТРИ трубы, когда он известен только на концах.

Геометрия прогноза 22871: сдвиг 2022 -> профиль (2023) известен на концах (соседи 9490 / 11604),
внутри — прямая. Модель ошибок одометра: pos_r = x + e_r(x); у 1250011604 пропуски 2018 и 2023
согласованы (2018 -> 2023 ≈ +11.0..11.5 м по всей трубе), а 2022 даёт скачок (2018 -> 2022:
+3.6..4.2 -> −1.4; 2022 -> 2023: +7.5 -> +12.7 около 370 м) — скользит именно пропуск 2022.
Отсюда композиция: d22->prof(x) = прямая_по_концам(x) − [d18->22(x) − прямая_по_концам(d18->22)(x)],
нелинейная часть сдвига 2018 -> 2022 той же трубы переносится в сдвиг 2022 -> профиль.

Симуляция на 1250011604 (единственная валидационная труба с длиной > 60 м): истина — окна
2022 -> 2023 (match); методы получают истину только в крайних окнах:
  line  — прямая между концами (как сейчас у 22871);
  comp  — композиция с окнами 2018 -> 2022 этой трубы (сырые и сглаженные медианой 3);
  oracle — все окна 2022 -> 2023 (как case1_measured).
Метрики: ошибка сдвига по окнам (RMSE, max) и r²/r2d quant и aligned_stats по 50 сегментам 11604.

ИТОГ (1250011604, 50 сегм.; quant r² / r2d):
  line (сейчас)        RMSE сдвига 2.17 м, max 3.82   0.738 / 0.409
  comp (сырые окна)    0.82 / 2.82                    0.755 / 0.430
  comp med3            0.83 / 2.81                    0.758 / 0.438
  comp fit (детренд регрессией) 1.38 / 3.46           0.743 / 0.412 — опорная прямая должна идти через концы
  prod (align.py: медиана-5, опоры по 3 крайних окна, затухание к краям) 0.98 / 2.89   0.748 / 0.418
  oracle                                              0.764 / 0.451
ПРИНЯТО в align.to_profile (PIPETWIN_CASE1_COMPOSE=1 по умолчанию), только путь кейса 1 (method=match,
прогноз 22871); строки обучения, валидация и кейс 2 не меняются (validation_report байт в байт).
Медиана-5 вместо 3 — из-за шума окон 22871 (соседние окна 2018->2022 расходятся на 0.65 м против
0.2 у 11604, одиночный выброс −8.15 м), выбрано до замера на 22871. На 22871 поправка: в среднем
0.63 м, максимум 2.1 м (бугор +2 м сдвига 2018->2022 на 2750-3600 м); прогноз 22871 меняется с
корреляцией 0.974 к прежнему (max |Δ| 1.5 мм). Оговорка: проверка на ОДНОЙ трубе (11604); у 22871
предпосылка «скользит пропуск 2022, а 2018 согласован с профилем» не проверяема.
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


def pts(vtd, a, b):
    p = A.window_shifts(vtd, PID, a, b, "match")
    return np.array([q[0] for q in p]), np.array([q[1] for q in p])


def line_ends(x, y):
    o = np.argsort(x)
    x, y = x[o], y[o]
    k = (y[-1] - y[0]) / (x[-1] - x[0])
    return lambda d: y[0] + k * (np.asarray(d, float) - x[0])


def med3(y):
    return pd.Series(y).rolling(3, center=True, min_periods=1).median().to_numpy()


def robust_dev(x, s):
    """Нелинейная часть сдвига 2018 -> 2022: медиана-3 по окнам минус устойчивая прямая
    (align._fit: два прохода с отбросом > 3 м). Шумные одиночные окна (у 22871 −8.15 при
    соседях +1) гасятся медианой."""
    o = np.argsort(x)
    x, s = np.asarray(x, float)[o], med3(np.asarray(s, float)[o])
    return A._interp(x, s - A._fit(x, s)(x))


def compose(lin, x, s):
    dev = robust_dev(x, s)
    return lambda d: lin(d) - dev(d)


def main():
    passport = prepare.load_passport()
    nseg = prepare.n_segments(prepare.load_altitudes())
    vtd = prepare.load_vtd()
    runs = prepare.build_runs(vtd)
    x23, s23 = pts(vtd, R22, R23)
    x18, s18 = pts(vtd, R18, R22)
    # окна 2018 -> 2022 — в координатах 2018; переводим в координаты 2022
    x18_in22 = x18 + s18
    truth = A._interp(x23, s23)
    lin = line_ends(x23, s23)
    meth = {"oracle": truth, "line": lin}
    for tag, yy in (("comp", s18), ("comp med3", med3(s18))):
        dev_line = line_ends(x18_in22, yy)
        dev = A._interp(x18_in22, yy - dev_line(x18_in22))
        meth[tag] = (lambda d, dev=dev: lin(d) - dev(d))
    meth["comp fit"] = compose(lin, x18_in22, s18)
    dev = A.inside_dev(vtd, PID, R18, R22)  # прод-вариант (align.py: медиана-5, опоры по 3 окна)
    meth["prod (align)"] = (lambda d: lin(d) - dev(d))
    print("окна 2022->2023:", list(zip(x23.round(), s23)))
    print("окна 2018->2022 (в коорд. 2022):", list(zip(x18_in22.round(), s18)))
    xs = np.arange(x23.min(), x23.max() + 1, 10.0)
    for m, f in meth.items():
        err = f(xs) - truth(xs)
        print(f"{m:10s} ошибка сдвига: RMSE {np.sqrt(np.mean(err ** 2)):.2f} м, max {np.abs(err).max():.2f} м")

    ds = pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv", parse_dates=["start", "end"])
    va = ds[(ds["split"] == "val_case1_measured") & (ds["id"] == PID)].sort_values("segment_id")
    y, hd = va["y"].values, va["had_defect"].values.astype(bool)
    age = (R22 - passport.set_index("id").loc[PID, "date_in"]) / YEAR
    rows = []
    for m, f in meth.items():
        # прошлый пропуск 2022 -> профиль: шаг 2022 -> 2023 (2023 в координатах профиля)
        sv = A.shifted_vtd(vtd, PID, R22, f, int(nseg.loc[PID]))
        st = F.start_state_features(sv, runs, nseg, passport, PID, R22, "vtd2vtd", age)
        st = va[["segment_id"]].merge(st, on="segment_id", how="left")
        for kind, sc in (("quant", T.quant_score(st)), ("aligned_stats", T.aligned_stats_score(st)),
                         ("prev_min", st["prev_min"].values)):
            rows.append(dict(method=m, score=kind, r2=T.pearson_r2(y, sc),
                             r2d=T.pearson_r2(y[hd], sc[hd])))
    df = pd.DataFrame(rows)
    print(df.pivot_table(index="method", columns="score", values=["r2", "r2d"]).round(4).to_string())


if __name__ == "__main__":
    main()
