"""Лаборатория 74: реперы ВТД (задвижки, знаки) как опора сдвига 2018 -> 2022 трубы 1250022871.

В пропусках 2018/2022 у дефектов есть ref_point_up/down и расстояние до них (в 2023 нет).
Позиция репера в координатах пропуска = медиана dist ∓ ref_dist по дефектам в 150 м от него
(знак выбирается по меньшему разбросу: у нижнего репера в 2018 расстояние отрицательное, в 2022
положительное). Общие реперы 22871: камера запуска 0 км, знак 2 км, камера приёма 5.7 км.

Варианты сдвига 2018 -> 2022 (дистанция 2018 -> дистанция 2022):
  none     — без сдвига;
  match    — окна совпавших дефектов, как align.own_shift(method=match);
  markers  — кусочно-линейно через 3 репера;
  hybrid   — match + кусочно-линейная поправка, равная (репер − match) в точках реперов;
  line     — по соседям нитки (align.line_shift, как self22 в проде).
Таргет — пропуск 2022 в координатах профиля (align.to_profile 2022, method=match); прошлый пропуск
2018 сдвигается вариантом и тем же переводом 2022 -> профиль. Метрики на 525 сегментах:
r² / r2d (только сегменты с дефектом) для quant, aligned_stats, prev_min; доля совпавших дефектов
2018 (±0.15 м, ±12°) под каждым сдвигом.

ИТОГ (2026-11-15): реперы НЕ приняты.
  Реперы: камера запуска −4.97 м (match −3.85), знак 2 км +0.59 (match −1.67), камера приёма −1.34
  (match +1.05; позиция по 50 ближайшим дефектам, они в ~500 м от репера).
  Доля совпавших дефектов 2018 (фон при нулевом сдвиге 0.27 — пропуск 2022 плотный):
  match 0.386, match5 0.386, line 0.343, markers_lin 0.319, markers 0.296 — по реперам дефекты
  совпадают почти на уровне фона, то есть реперы локально врут на 1–3 м (или «маркер 2 км» и
  «2.1 км Знак» — разные объекты).
  quant r² self22: none 0.144, match 0.148, match5 0.161, markers 0.147, markers_lin 0.158,
  hybrid 0.139, hybrid5 0.153, line (соседи) 0.177. Бутстрап по блокам 100 м против match5:
  markers −0.013 [−0.036, +0.005], hybrid −0.021 [−0.046, −0.002], line +0.015 [−0.001, +0.031], P 0.94.
  Нелинейная часть match у 22871 — сигнал, а не шум: match5 против своей опорной прямой (match5_ends,
  как в inside_dev) quant r² 0.161 против 0.135, разность +0.027 [+0.004, +0.059], P 0.98; доля
  совпавших 0.386 против 0.337. Прямая по соседям (line 0.177) — другая прямая (наклон −6 -> +3 м),
  её перевес над match5 не значим (P 0.93).
  PIPETWIN_CASE1_COMPOSE=0 на прогнозе 22871 (scratchpad compose_check.py, модели те же): корреляция с
  compose=1 0.9845, mean|Δ| 0.040 мм, max 1.38 мм (сегм. 185), |Δ| > 0.1 мм у 42 из 525, топ-10% тонких
  совпадают на 50 из 53; сдвиг 2022 -> профиль расходится до 2.1 м на 2.75–3.5 км. Кейс 2 не меняется.
  Композиция ОСТАВЛЕНА: нелинейная часть 2018 -> 2022 реальна, а на 11604 она принадлежит пропуску
  2022 (lab71). Чей это сдвиг у 22871 (2018 или 2022), проверить нельзя.

Запуск: uvx --with duckdb --with pandas --with numpy --with scipy python experiments/lab74_markers.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from pipetwin import align as A  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import prepare  # noqa: E402
from pipetwin import train as T  # noqa: E402
from pipetwin import warehouse as W  # noqa: E402

PID = 1250022871
R18, R22 = pd.Timestamp("2018-09-23"), pd.Timestamp("2022-07-06")
YEAR = pd.Timedelta(days=365.25)
NEAR = 150.0
PAIRS = {  # общий объект: (имя в 2018, имя в 2022)
    "launch 0 км": ("задвижка (шток) 0 км, Камера запуска (КПСОД-1)ЗКЛ-1",
                    "задвижка (шток), 0 км. Камера запуска - Куст-1"),
    "знак 2 км": ("маркер 2 км, Информационный знак", "2.1 км Знак трубопровода"),
    "приём 5.7 км": ("задвижка (шток) 5.754 км, Камера приёма(КПСОД-2) ЗКЛ-2",
                     "задвижка (шток), 5.7 км. Камера приема - ДНС-1"),
}


def marker_positions() -> pd.DataFrame:
    d = W.query(f"""
        select run_date, 'up' side, ref_point_up r, dist_m, ref_point_up_dist_m rd from core.ili_feature
        where pipe_id = {PID} and ref_point_up is not null
        union all
        select run_date, 'down', ref_point_down, dist_m, ref_point_down_dist_m from core.ili_feature
        where pipe_id = {PID} and ref_point_down is not null""")
    rows = []
    for (run, side, r), g in d.groupby(["run_date", "side", "r"]):
        # дефекты в NEAR м от репера; если таких нет — 50 ближайших (камера приёма 5.7 км)
        lim = max(NEAR, g["rd"].abs().nsmallest(50).max())
        g = g[g["rd"].abs() <= lim]
        cand = [(g["dist_m"] - g["rd"]), (g["dist_m"] + g["rd"])]
        best = min(cand, key=lambda s: s.quantile(0.9) - s.quantile(0.1))
        rows.append(dict(run=pd.Timestamp(run).year, side=side, r=r, lim=lim, pos=best.median(),
                         spread=best.quantile(0.9) - best.quantile(0.1), n=len(g)))
    return pd.DataFrame(rows)


def marker_points(mp: pd.DataFrame):
    xs, ss = [], []
    for tag, (n18, n22) in PAIRS.items():
        a = mp[(mp["run"] == 2018) & (mp["r"] == n18)]
        b = mp[(mp["run"] == 2022) & (mp["r"] == n22)]
        if len(a) and len(b):
            # среднее по сторонам (up/down), где обе есть
            p18, p22 = a["pos"].mean(), b["pos"].mean()
            xs.append(p18)
            ss.append(p22 - p18)
            print(f"  {tag:14s} 2018 {p18:8.2f}  2022 {p22:8.2f}  сдвиг {p22 - p18:+.2f} м  "
                  f"(разброс сторон 2018 {np.ptp(a['pos']) if len(a) > 1 else 0:.2f}, "
                  f"2022 {np.ptp(b['pos']) if len(b) > 1 else 0:.2f})")
    return np.array(xs), np.array(ss)


def matched_share(vtd, f) -> float:
    a = A._xa(vtd[(vtd["id"] == PID) & (vtd["run_date"] == R18)])
    b = A._xa(vtd[(vtd["id"] == PID) & (vtd["run_date"] == R22)])
    a2 = a.copy()
    a2[:, 0] = a[:, 0] + f(a[:, 0])
    return A._n_matched(a2, b, 0.0) / len(a)


def main():
    passport = prepare.load_passport()
    nseg = prepare.n_segments(prepare.load_altitudes())
    vtd = prepare.load_vtd()
    runs = prepare.build_runs(vtd)

    mp = marker_positions()
    print("Реперы 22871 (дефекты в 150 м от репера):")
    print(mp.round(2).to_string(index=False))
    print("Общие реперы 2018 -> 2022:")
    mx, ms = marker_points(mp)

    match = A.own_shift(vtd, PID, R18, R22, "match")
    o = np.argsort(mx)
    mx, ms = mx[o], ms[o]
    markers = A._interp(mx, ms)
    corr = A._interp(mx, ms - match(mx))
    hybrid = lambda d: match(d) + corr(d)  # noqa: E731
    pts = A.window_shifts(vtd, PID, R18, R22, "match")
    wx = np.array([p[0] for p in pts])
    ws = pd.Series([p[1] for p in pts]).rolling(5, center=True, min_periods=1).median().to_numpy()
    match5 = A._interp(wx, ws)  # как в проде (inside_dev): медиана по 5 окнам
    corr5 = A._interp(mx, ms - match5(mx))
    hybrid5 = lambda d: match5(d) + corr5(d)  # noqa: E731
    # опорная прямая match5 как в inside_dev: медианы по 3 крайних окна с каждой стороны —
    # проверка, несёт ли нелинейная часть сдвига (её переносит композиция lab71) сигнал
    k3 = A.INSIDE_ANCHOR
    x0, x1 = wx[:k3].mean(), wx[-k3:].mean()
    y0, y1 = np.median(ws[:k3]), np.median(ws[-k3:])
    ends5 = lambda d: y0 + (y1 - y0) * (np.asarray(d, float) - x0) / (x1 - x0)  # noqa: E731
    k, b = np.polyfit(mx, ms, 1)
    mline = lambda d: k * np.asarray(d, float) + b  # noqa: E731
    line = A.line_shift(vtd, passport, PID, R18, R22, "match")
    zero = lambda d: np.zeros_like(np.asarray(d, float))  # noqa: E731
    meth = {"none": zero, "match": match, "match5": match5, "match5_ends": ends5, "markers": markers, "markers_lin": mline,
            "hybrid": hybrid, "hybrid5": hybrid5, "line": line}

    xs = np.arange(0, 5250, 250.0)
    print("\nСдвиг 2018 -> 2022 по дистанции 2018, м:")
    print(pd.DataFrame({m: f(xs) for m, f in meth.items()}, index=xs.astype(int)).round(2).to_string())
    print("\nmatch в точках реперов:", dict(zip(mx.round(0), match(mx).round(2))),
          " реперы:", dict(zip(mx.round(0), ms.round(2))))

    g22 = A.to_profile(vtd, passport, PID, R22, method="match")
    n = int(nseg.loc[PID])
    tgt = prepare.segment_targets(A.shifted_vtd(vtd, PID, R22, g22, n), runs, nseg, PID, R22)
    tgt = tgt.sort_values("segment_id")
    y, hd = tgt["y"].values, tgt["had_defect"].values.astype(bool)
    age = (R18 - passport.set_index("id").loc[PID, "date_in"]) / YEAR
    rows, scores = [], {}
    for m, f in meth.items():
        def full(d, f=f):
            d = np.asarray(d, float)
            d22 = d + f(d)
            return d22 + g22(d22) - d
        sv = A.shifted_vtd(vtd, PID, R18, full, n)
        st = F.start_state_features(sv, runs, nseg, passport, PID, R18, "vtd2vtd", age)
        st = tgt[["segment_id"]].merge(st, on="segment_id", how="left")
        row = dict(method=m, matched=matched_share(vtd, f))
        scores[m] = T.quant_score(st)
        for kind, sc in (("quant", T.quant_score(st)), ("aligned_stats", T.aligned_stats_score(st)),
                         ("prev_min", st["prev_min"].values)):
            row[f"{kind} r2"] = T.pearson_r2(y, sc)
            row[f"{kind} r2d"] = T.pearson_r2(y[hd], sc[hd])
        rows.append(row)
    print(f"\nself22 (22871 2018 -> 2022), {len(y)} сегм., с дефектом {hd.sum()}:")
    print(pd.DataFrame(rows).set_index("method").round(4).to_string())
    # блочный бутстрап (блоки по 10 сегментов = 100 м): разность quant r² с match5 (прод-кривая)
    rng = np.random.default_rng(0)
    nb = len(y) // 10
    blocks = np.arange(nb * 10).reshape(nb, 10)
    print("\nquant r²: разность с match5, бутстрап 2000 по блокам 100 м (среднее, 5%, 95%, P>0)")
    for m in meth:
        d = []
        for _ in range(2000):
            i = blocks[rng.integers(0, nb, nb)].ravel()
            d.append(T.pearson_r2(y[i], scores[m][i]) - T.pearson_r2(y[i], scores["match5"][i]))
        d = np.array(d)
        print(f"  {m:12s} {d.mean():+.4f}  [{np.quantile(d, .05):+.4f}, {np.quantile(d, .95):+.4f}]  {np.mean(d > 0):.2f}")


if __name__ == "__main__":
    main()
