"""Выравнивание дистанций ВТД между пропусками (сбой одометра снаряда).

Дистанции одного и того же дефекта в разных пропусках расходятся на метры: на 1250011604
пропуск 2023 сдвинут на +8 м относительно 2022 по всей трубе, на 1250022871 сдвиг 2018 -> 2022
плавно меняется вдоль трассы от −5 до +2 м. При сегменте 10 м это ломает признаки «прошлого
пропуска»: состояние стенки берётся не с того сегмента.

Сдвиг оценивается взаимной корреляцией профилей глубины дефектов в окнах вдоль трубы и
аппроксимируется линией (дистанция прошлого пропуска -> дистанция целевого). Если целевого
пропуска нет (прогноз кейса 1), сдвиг интерполируется по координате нитки (Distance_raw) из
оценок соседних труб той же нитки на ту же пару пропусков.

PIPETWIN_ALIGN: off — не выравнивать (как раньше);
                line — обучение по оценке пары, валидация кейса 1 и прогноз по соседям;
                oracle — валидация тоже по своей паре (верхняя граница, только для экспериментов);
                profile (по умолчанию) — все пропуски (и прошлый, и целевой) в координатах профиля трассы, как у
                          пропусков 2023 года: признаки рельефа совпадают с таргетом.
"""
import os

import numpy as np
import pandas as pd

from . import config as C
from . import warehouse as W

MODE = os.environ.get("PIPETWIN_ALIGN", "profile")
ORACLE = os.environ.get("PIPETWIN_ALIGN_ORACLE") == "1"  # только эксперименты: валидация со своим сдвигом
MAX_SHIFT = 40      # м, поиск сдвига
MIN_CORR = 0.3      # окно с более слабой корреляцией не используется
LOCAL = 6           # м, отклонение сдвига окна от общего сдвига трубы
_cache: dict = {}


def _profile(d: pd.DataFrame, length: int) -> np.ndarray:
    v = np.zeros(length + 1)
    idx = d["Distance"].astype(int).clip(0, length).to_numpy()
    np.maximum.at(v, idx, d["Defect Depth in %"].fillna(0).to_numpy())
    return v


def _best_shift(a: np.ndarray, b: np.ndarray, lo: int = -MAX_SHIFT, hi: int = MAX_SHIFT) -> tuple[int, float]:
    if a.std() == 0 or b.std() == 0:
        return 0, -1.0
    best = (0, -1.0)
    for k in range(lo, hi + 1):
        sa = np.roll(a, k)
        c = np.corrcoef(sa, b)[0, 1]
        if np.isfinite(c) and c > best[1]:
            best = (k, float(c))
    return best


def window_shifts(vtd: pd.DataFrame, pipe_id: int, run_a, run_b) -> list[tuple[float, float]]:
    """Точки (дистанция центра окна в координатах пропуска A, сдвиг A -> B)."""
    key = ("w", pipe_id, run_a, run_b)
    if key in _cache:
        return _cache[key]
    sub = vtd[vtd["id"] == pipe_id]
    a, b = sub[sub["run_date"] == run_a], sub[sub["run_date"] == run_b]
    pts = []
    if len(a) and len(b):
        length = int(max(a["Distance"].max(), b["Distance"].max())) + MAX_SHIFT + 1
        pa, pb = _profile(a, length), _profile(b, length)
        # общий сдвиг по всей трубе — якорь; в окнах ищем только рядом с ним (±LOCAL м),
        # иначе на редких дефектах находятся ложные пики в десятки метров
        k0, c0 = _best_shift(pa, pb)
        if c0 >= MIN_CORR / 2:
            win = min(250, length)
            step = max(win // 2, 1)
            for w0 in range(0, max(length - win, 0) + 1, step):
                k, c = _best_shift(pa[w0:w0 + win], pb[w0:w0 + win], k0 - LOCAL, k0 + LOCAL)
                if c >= MIN_CORR:
                    pts.append((w0 + win / 2, float(k)))
            if not pts:
                pts.append((length / 2, float(k0)))
    _cache[key] = pts
    return pts


def _fit(x: np.ndarray, y: np.ndarray):
    """Устойчивая линия: два прохода с отбросом выбросов > 3 м от первой оценки."""
    if len(x) == 0:
        return lambda d: np.zeros_like(np.asarray(d, dtype=float))
    if len(x) < 2 or np.ptp(x) < 100:
        m = float(np.median(y))
        return lambda d: np.full_like(np.asarray(d, dtype=float), m)
    k, b = np.polyfit(x, y, 1)
    ok = np.abs(y - (k * x + b)) <= 3
    if len(x) >= 4 and ok.sum() >= 3:
        k, b = np.polyfit(x[ok], y[ok], 1)
    return lambda d: k * np.asarray(d, dtype=float) + b


def raw_offsets() -> pd.Series:
    """Начало трубы в координате нитки: Distance_raw − Distance (одно на трубу)."""
    if "raw" not in _cache:
        _cache["raw"] = W.query("""
            select pipe_id as id, median(dist_raw_m - dist_m) as off
            from core.ili_feature where dist_raw_m is not null group by 1""").set_index("id")["off"]
    return _cache["raw"]


def own_shift(vtd, pipe_id, run_a, run_b):
    pts = window_shifts(vtd, pipe_id, run_a, run_b)
    return _fit(np.array([p[0] for p in pts]), np.array([p[1] for p in pts]))


def line_shift(vtd, passport, pipe_id, run_a, run_b):
    """Сдвиг для трубы по соседям той же нитки (координата Distance_raw)."""
    pas = passport.set_index("id")
    off = raw_offsets()
    same = pas.index[(pas["direction"] == pas.loc[pipe_id, "direction"]) & (pas.index != pipe_id)]
    xs, ys = [], []
    for nb in same:
        if nb not in off.index:
            continue
        for x, s in window_shifts(vtd, nb, run_a, run_b):
            xs.append(x + off[nb])
            ys.append(s)
    f = _fit(np.array(xs), np.array(ys))
    o = off.get(pipe_id, 0.0)
    return lambda d: f(np.asarray(d, dtype=float) + o)


def is_case1_val(pipe_id, start, end) -> bool:
    ids = C.VAL_CASE1_IDS
    return (pd.Timestamp(start) == pd.Timestamp(C.VAL_CASE1_START)
            and pd.Timestamp(end) == pd.Timestamp(C.VAL_CASE1_END)
            and (ids is None or pipe_id in ids))


def shift_for_pair(vtd, passport, pipe_id, start, end, has_target: bool):
    """Функция сдвига дистанций прошлого пропуска в координаты целевого, или None."""
    if MODE == "off":
        return None
    if has_target and (MODE == "oracle" or not is_case1_val(pipe_id, start, end)):
        return own_shift(vtd, pipe_id, start, end)
    return line_shift(vtd, passport, pipe_id, start, end)


def has_heights() -> set:
    """Пропуски, записанные в координатах профиля трассы: у дефектов есть высота, и она
    совпадает с профилем при нулевом сдвиге (проверено для всех пропусков 2023 года)."""
    if "h" not in _cache:
        _cache["h"] = set(map(tuple, W.query("""
            select distinct pipe_id, run_date from core.ili_feature where height_m is not null
        """).itertuples(index=False)))
    return _cache["h"]


def to_profile(vtd, passport, pipe_id, run, exclude=None):
    """Функция: дистанция пропуска run -> координата профиля трассы.

    Пропуск с высотами уже в координатах профиля. Иначе сдвиг до более позднего пропуска той же
    трубы с высотами (кроме exclude — целевого пропуска валидации); если такого нет — до последнего
    пропуска трубы и дальше по соседям нитки до их пропуска с высотами.
    """
    zero = lambda d: np.zeros_like(np.asarray(d, dtype=float))  # noqa: E731
    run = pd.Timestamp(run)
    hs = has_heights()
    exclude = pd.Timestamp(exclude) if exclude is not None else None
    pas = passport.set_index("id")
    nbrs = pas.index[(pas["direction"] == pas.loc[pipe_id, "direction"]) & (pas.index != pipe_id)]
    ref = sorted({r for p, r in hs if p in nbrs})
    # цепочка соседних пропусков трубы: run -> следующий -> ... -> пропуск с высотами;
    # если пропуска с высотами нет (или он исключён) — последний шаг по соседям нитки
    runs = sorted(pd.Timestamp(r) for r in vtd.loc[vtd["id"] == pipe_id, "run_date"].unique())
    chain = [r for r in runs if r >= run and r != exclude]
    steps, cur = [], run
    for nxt in chain[1:]:
        if (pipe_id, cur) in hs:
            break
        steps.append(own_shift(vtd, pipe_id, cur, nxt))
        cur = nxt
    if (pipe_id, cur) not in hs:
        if not ref:
            return zero
        steps.append(line_shift(vtd, passport, pipe_id, cur, ref[-1]))
    if not steps:
        return zero

    def f(d):
        x = np.asarray(d, dtype=float)
        y = x.copy()
        for s in steps:
            y = y + s(y)
        return y - x
    return f


def shifted_vtd(vtd: pd.DataFrame, pipe_id, run_date, f, nseg_pipe: int) -> pd.DataFrame:
    """Пропуск run_date трубы pipe_id с дистанциями, пересчитанными функцией f."""
    sub = vtd[(vtd["id"] == pipe_id) & (vtd["run_date"] == run_date)].copy()
    sub["Distance"] = sub["Distance"] + f(sub["Distance"].to_numpy())
    sub["segment_id"] = np.floor(sub["Distance"] / C.SEG_LEN).astype(int)
    return sub[(sub["segment_id"] >= 0) & (sub["segment_id"] < nseg_pipe)]
