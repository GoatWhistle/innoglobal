"""Лаборатория 81: выравнивание пропусков ВТД по кольцевым швам (DTW-подобная цепочка).

Позиция шва в каждом пропуске = dist_m − dist_from_weld_m (у всех особенностей). joint_no между
пропусками НЕ согласован (у 1250011604 2022 -> 2023 нумерация сдвинута на 1 трубу, внутри трубы
скачок), поэтому швы сопоставляются монотонной цепочкой: узлы — пары (шов A, шов B) в окне ±MAX_SHIFT
вокруг общего сдвига, вес узла +1, переход штрафуется изменением сдвига (|Δ|/SIG, скачок > JUMP —
фиксированный штраф: вставка/вырезка трубы). Внутри трубы — кусочно-линейно между совпавшими швами.

Проверка: доля дефектов A, нашедших пару в B (дистанция ±0.15 м, угол ±12°) после пересчёта
функцией сдвига — независимая «истина» соответствия. Сравнение: corr, match (align.py), weld.
Запуск: python experiments/lab81_weld_dtw.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from pipetwin import align as A  # noqa: E402
from pipetwin import prepare  # noqa: E402

DX, DA = 0.15, 12.0


def matched_frac(a, b, f):
    """Доля дефектов a (Distance, Angle), у которых есть пара в b после x -> x + f(x)."""
    a = a.dropna(subset=["Angle"])
    b = b.dropna(subset=["Angle"]).sort_values("Distance")
    if len(a) == 0 or len(b) == 0:
        return np.nan
    xa = a["Distance"].to_numpy(float)
    xa = xa + f(xa)
    aa = a["Angle"].to_numpy(float)
    xb, ab = b["Distance"].to_numpy(float), b["Angle"].to_numpy(float)
    lo, hi = np.searchsorted(xb, xa - DX), np.searchsorted(xb, xa + DX)
    hit = np.zeros(len(xa), bool)
    for j in range(int((hi - lo).max(initial=0))):
        idx = np.minimum(lo + j, len(xb) - 1)
        da = np.abs((ab[idx] - aa + 180) % 360 - 180)
        hit |= (lo + j < hi) & (da < DA)
    return hit.mean()


def main():
    vtd = prepare.load_vtd()
    pairs = []
    for pid, g in vtd.groupby("id"):
        rs = sorted(g["run_date"].unique())
        for i in range(len(rs) - 1):
            pairs.append((pid, pd.Timestamp(rs[i]), pd.Timestamp(rs[i + 1])))
    rows = []
    for pid, ra, rb in pairs:
        sub = vtd[vtd["id"] == pid]
        a, b = sub[sub["run_date"] == ra], sub[sub["run_date"] == rb]
        if len(a) < 10 or len(b) < 10:
            continue
        r = dict(pipe=pid, a=ra.date(), b=rb.date(), na=len(a), nb=len(b))
        r["zero"] = matched_frac(a, b, lambda x: np.zeros_like(x))
        for m in ("corr", "match", "weld"):
            A._cache.clear()
            try:
                f = A.own_shift(vtd, pid, ra, rb, m)
                r[m] = matched_frac(a, b, f)
            except Exception as e:  # noqa: BLE001
                print("ERR", pid, m, e)
                r[m] = np.nan
        wa, wb = A.welds(pid, ra), A.welds(pid, rb)
        ch = A.weld_chain(wa, wb)
        r["welds"] = f"{len(wa)}/{len(wb)}"
        r["chain"] = len(ch)
        rows.append(r)
        print(r, flush=True)
    df = pd.DataFrame(rows)
    pd.set_option("display.width", 200)
    print(df.round(3).to_string(index=False))


if __name__ == "__main__":
    main()

# ИТОГ (доля дефектов A с парой в B; zero / corr / match / weld):
#   9490  2022->2023  0.417 / 0.422 / 0.839 / 0.843
#   11604 2018->2022  0.170 / 0.170 / 0.385 / 0.390
#   11604 2022->2023  0.171 / 0.312 / 0.644 / 0.652   (скачок +4.6 м у 338 м — локализован до шва)
#   22871 2018->2022  0.266 / 0.350 / 0.386 / 0.427   (8/11 блоков по 500 м лучше, хуже 3.0-4.0 км)
# Устойчиво к WELD_SIG 0.1-1.0, WELD_EV 0-3, WELD_TOL 3-6. 11604: 2018 -> 2023 по швам 10.96..11.75 м
# без скачков — подтверждает предпосылку композиции lab71 (скользит пропуск 2022).
# run_all (сид 42): weld в оракуле валидации кейса 1 — 0.7475 -> 0.7478 (шум); weld для строк
# обучения (PIPETWIN_SHIFT=weld) — кейс 2 0.200 -> 0.140, ОТКАЗ; PIPETWIN_INSIDE=weld — ПРИНЯТО
# (валидация байт в байт, прогноз 22871 corr 0.994, max |Δ| 0.76 мм). См. lab81b.
