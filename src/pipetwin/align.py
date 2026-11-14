"""Выравнивание дистанций ВТД между пропусками (сбой одометра снаряда).

Дистанции одного и того же дефекта в разных пропусках расходятся на метры: на 1250011604
пропуск 2023 сдвинут на +8 м относительно 2022 по всей трубе, на 1250022871 сдвиг 2018 -> 2022
плавно меняется вдоль трассы от −5 до +2 м. При сегменте 10 м это ломает признаки «прошлого
пропуска»: состояние стенки берётся не с того сегмента.

Сдвиг оценивается в окнах вдоль трубы сопоставлением отдельных дефектов двух пропусков
(дистанция ±0.15 м, угол ±12°, PIPETWIN_SHIFT=match; при неудаче — взаимной корреляцией
профилей глубины, PIPETWIN_SHIFT=corr — как было) и аппроксимируется линией (дистанция прошлого пропуска -> дистанция целевого). Если целевого
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
# Метод оценки сдвига: match — по совпавшим дефектам, corr — корреляция профилей глубины.
# Кейс 1 (валидация 2022 -> 2023 и прогноз 22871) — match: точнее на метры (1250009490: +1.8 м
# против −1 м у corr), от этого зависит сдвиг начала 22871 в прогнозе. Остальные пары — corr, как
# было: с match прогноз кейса 2 меняется почти целиком (corr 0.24 со сданным) при той же строгой
# валидации (0.016 у обоих), то есть без доказанного выигрыша.
SHIFT_METHOD = os.environ.get("PIPETWIN_SHIFT", "corr")
CASE1_SHIFT_METHOD = os.environ.get("PIPETWIN_SHIFT_CASE1", "match")
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


MATCH_DX, MATCH_DA = 0.15, 12.0   # м и градусы: допуск «тот же дефект» в двух пропусках
MATCH_STEP = 0.05                  # м, шаг поиска сдвига в окне
MATCH_MIN, MATCH_PEAK = 8, 2.0     # мин. число совпадений и во сколько раз пик выше медианы сетки
MATCH_WIN = 60.0                   # м, окно: локализует скачки одометра (1250011604: +7.5 -> +12.7 м около 340 м)


def _xa(d: pd.DataFrame) -> np.ndarray:
    d = d.dropna(subset=["Distance", "Angle"]).sort_values("Distance")
    return d[["Distance", "Angle"]].to_numpy(dtype=float)


def _n_matched(A: np.ndarray, B: np.ndarray, k: float) -> int:
    """Сколько дефектов A имеют пару в B на дистанции x_A + k (±MATCH_DX) и угле ±MATCH_DA."""
    if len(A) == 0 or len(B) == 0:
        return 0
    xb, ab = B[:, 0], B[:, 1]
    lo = np.searchsorted(xb, A[:, 0] + k - MATCH_DX)
    hi = np.searchsorted(xb, A[:, 0] + k + MATCH_DX)
    hit = np.zeros(len(A), dtype=bool)
    for j in range(int((hi - lo).max(initial=0))):
        idx = lo + j
        da = np.abs((ab[np.minimum(idx, len(xb) - 1)] - A[:, 1] + 180) % 360 - 180)
        hit |= (idx < hi) & (da < MATCH_DA)
    return int(hit.sum())


def _match_shift(A: np.ndarray, B: np.ndarray, lo: float, hi: float, step: float = MATCH_STEP,
                 peak: float = MATCH_PEAK):
    """Сдвиг A -> B с максимумом совпавших дефектов; None, если пик не выделяется из шума."""
    grid = np.arange(lo, hi + step / 2, step)
    sc = np.array([_n_matched(A, B, float(k)) for k in grid])
    i = int(sc.argmax())
    if sc[i] < MATCH_MIN or sc[i] < peak * max(float(np.median(sc)), 1.0):
        return None
    return float(grid[i])


def window_shifts_match(vtd: pd.DataFrame, pipe_id: int, run_a, run_b) -> list[tuple[float, float]]:
    """Сдвиг по сопоставлению отдельных дефектов (дистанция + угол), точность ~0.05 м.

    Корреляция профилей глубины с шагом 1 м на короткой трубе ошибается на метры: на 1250009490
    для 2022 -> 2023 она даёт −1 м, а совпавшие дефекты (213 из 343) — +1.8 м. Пустой список —
    мало дефектов с углом или пик не выделяется; тогда window_shifts откатывается на корреляцию.
    """
    sub = vtd[vtd["id"] == pipe_id]
    A, B = _xa(sub[sub["run_date"] == run_a]), _xa(sub[sub["run_date"] == run_b])
    if len(A) < MATCH_MIN or len(B) < MATCH_MIN:
        return []
    # общий якорь: на всей трубе пик размазан плавным дрейфом (2018 -> 2022 на 1250022871 от −7 до
    # +4 м), поэтому без проверки пика; строгая проверка — в окнах ±LOCAL вокруг якоря
    k0 = _match_shift(A, B, -MAX_SHIFT, MAX_SHIFT, step=0.1, peak=0.0)
    if k0 is None:
        return []
    length = float(max(A[-1, 0], B[-1, 0]))
    win = min(MATCH_WIN, length + 1)
    pts = []
    for w0 in np.arange(0, max(length - win / 2, 0) + 1, win / 2):
        m = (A[:, 0] >= w0) & (A[:, 0] < w0 + win)
        k = _match_shift(A[m], B, k0 - LOCAL, k0 + LOCAL)
        if k is not None:
            pts.append((float(w0 + win / 2), round(k, 2)))
    return pts or [(length / 2, round(k0, 2))]


def window_shifts(vtd: pd.DataFrame, pipe_id: int, run_a, run_b,
                  method: str | None = None) -> list[tuple[float, float]]:
    """Точки (дистанция центра окна в координатах пропуска A, сдвиг A -> B)."""
    method = method or SHIFT_METHOD
    key = ("w", pipe_id, run_a, run_b, method)
    if key in _cache:
        return _cache[key]
    sub = vtd[vtd["id"] == pipe_id]
    a, b = sub[sub["run_date"] == run_a], sub[sub["run_date"] == run_b]
    pts = window_shifts_match(vtd, pipe_id, run_a, run_b) if method == "match" else []
    if not pts and len(a) and len(b):
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


def _interp(x: np.ndarray, y: np.ndarray):
    """Кусочно-линейный сдвиг по окнам (метод match): сохраняет скачки одометра, которые прямая
    размазывает; за крайними окнами — постоянное значение."""
    if len(x) == 0:
        return lambda d: np.zeros_like(np.asarray(d, dtype=float))
    o = np.argsort(x)
    x, y = np.asarray(x, dtype=float)[o], np.asarray(y, dtype=float)[o]
    return lambda d: np.interp(np.asarray(d, dtype=float), x, y)


def _shift_fn(x, y, method):
    return _interp(x, y) if (method or SHIFT_METHOD) == "match" else _fit(x, y)


def raw_offsets() -> pd.Series:
    """Начало трубы в координате нитки: Distance_raw − Distance (одно на трубу)."""
    if "raw" not in _cache:
        _cache["raw"] = W.query("""
            select pipe_id as id, median(dist_raw_m - dist_m) as off
            from core.ili_feature where dist_raw_m is not null group by 1""").set_index("id")["off"]
    return _cache["raw"]


def own_shift(vtd, pipe_id, run_a, run_b, method=None):
    pts = window_shifts(vtd, pipe_id, run_a, run_b, method)
    return _shift_fn(np.array([p[0] for p in pts]), np.array([p[1] for p in pts]), method)


def line_shift(vtd, passport, pipe_id, run_a, run_b, method=None):
    """Сдвиг для трубы по соседям той же нитки (координата Distance_raw)."""
    pas = passport.set_index("id")
    off = raw_offsets()
    same = pas.index[(pas["direction"] == pas.loc[pipe_id, "direction"]) & (pas.index != pipe_id)]
    xs, ys = [], []
    for nb in same:
        if nb not in off.index:
            continue
        for x, s in window_shifts(vtd, nb, run_a, run_b, method):
            xs.append(x + off[nb])
            ys.append(s)
    f = _shift_fn(np.array(xs), np.array(ys), method)
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


# Сдвиг 2022 -> профиль у 22871 известен только на концах (соседи), внутри — прямая. Композиция
# (lab71): нелинейная часть сдвига 2018 -> 2022 этой же трубы переносится в сдвиг 2022 -> профиль —
# скользит снаряд 2022 (у 1250011604 пропуски 2018 и 2023 согласованы: 2018 -> 2023 ≈ +11.0..11.5 м,
# а 2022 даёт скачок +5 м около 370 м и в 2018 -> 2022, и в 2022 -> 2023). Симуляция «сдвиг известен
# только на концах» на 1250011604: ошибка сдвига RMSE 2.17 -> 0.83 м, quant r² 0.738 -> 0.758
# (оракул 0.764), r2d 0.409 -> 0.438 (оракул 0.451). PIPETWIN_CASE1_COMPOSE=0 — выключить.
COMPOSE = os.environ.get("PIPETWIN_CASE1_COMPOSE", "1") == "1"


INSIDE_MED, INSIDE_ANCHOR = 5, 3  # медиана по окнам; число крайних окон для опорной прямой


def inside_dev(vtd, pipe_id, run_a, run_b):
    """Нелинейная часть сдвига run_a -> run_b по окнам match (функция координаты run_b).

    Окна сглажены медианой INSIDE_MED (у 22871 пропуск 2018 редкий: соседние окна расходятся
    в среднем на 0.65 м, одиночные выбросы до 9 м), опорная прямая — через медианы
    INSIDE_ANCHOR крайних окон с каждой стороны (сами крайние окна шумные). Вне окон — края."""
    pts = window_shifts(vtd, pipe_id, run_a, run_b, "match")
    k = INSIDE_ANCHOR
    if len(pts) < 2 * k:
        return None
    x = np.array([p[0] + p[1] for p in pts])  # центр окна в координатах run_b
    s = np.array([p[1] for p in pts])
    o = np.argsort(x)
    x = x[o]
    s = pd.Series(s[o]).rolling(INSIDE_MED, center=True, min_periods=1).median().to_numpy()
    x0, x1 = x[:k].mean(), x[-k:].mean()
    y0, y1 = np.median(s[:k]), np.median(s[-k:])
    dev = s - (y0 + (y1 - y0) * (x - x0) / max(x1 - x0, 1e-9))
    # на концах трубы сдвиг известен (соседи) — поправка сходит к нулю на краях
    sub = vtd[(vtd["id"] == pipe_id) & (vtd["run_date"] == run_b)]
    length = float(sub["Distance"].max()) if len(sub) else float(x[-1])
    xs = np.concatenate([[min(0.0, x[0] - 1)], x, [max(length, x[-1] + 1)]])
    ds = np.concatenate([[0.0], dev, [0.0]])
    return lambda d: np.interp(np.asarray(d, dtype=float), xs, ds)


def compose_inside(vtd, pipe_id, runs, run, ls):
    """Сдвиг run -> профиль = ls (прямая по соседям) − нелинейная часть сдвига (предыдущий пропуск -> run)."""
    prev = [r for r in runs if r < run]
    dev = inside_dev(vtd, pipe_id, prev[-1], run) if prev else None
    if dev is None:
        return ls
    return lambda d: ls(d) - dev(d)


def has_heights() -> set:
    """Пропуски, записанные в координатах профиля трассы: у дефектов есть высота, и она
    совпадает с профилем при нулевом сдвиге (проверено для всех пропусков 2023 года)."""
    if "h" not in _cache:
        _cache["h"] = set(map(tuple, W.query("""
            select distinct pipe_id, run_date from core.ili_feature where height_m is not null
        """).itertuples(index=False)))
    return _cache["h"]


def to_profile(vtd, passport, pipe_id, run, exclude=None, method=None):
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
        steps.append(own_shift(vtd, pipe_id, cur, nxt, method))
        cur = nxt
    if (pipe_id, cur) not in hs:
        if not ref:
            return zero
        ls = line_shift(vtd, passport, pipe_id, cur, ref[-1], method)
        # только путь кейса 1 (method=match: прогноз 22871); строки обучения и кейс 2 — как были
        if (COMPOSE and method == "match" and pipe_id == C.CASE1_ID
                and cur == pd.Timestamp(C.CASE1_PREV_RUN)):
            ls = compose_inside(vtd, pipe_id, runs, cur, ls)
        steps.append(ls)
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
