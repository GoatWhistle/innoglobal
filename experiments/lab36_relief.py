"""Лаборатория, серия 36 (кейс 2): признаки рельефа и признаки-идентификаторы трубы.

Находка (разбор вкладов LGBM на 9583): у сданного прогноза 84% сегментов = 6.000
(«чистая труба ЦППН 6 мм»), 16% — 6.5-7.0 мм; эти 16% выделяет абсолютная отметка
z 78-83 м (вклад +0.64 мм) — диапазон отметок труб Куст-1. После сдвига p99 -> 4.5
полка 6.000 становится 3.740, т.е. ПОЛКА = «чистые» сегменты, а «толстые» —
похожие на корродирующую Куст-1. Признаки z/dist_m/dist_frac/t_at работают как
идентификатор трубы (на V1 — запоминание карты 22871 по пропуску 2022).
Варианты: убрать идентификаторы; добавить относительные признаки карманов
(c2feats.RELIEF: прогиб относительно скользящих окон, кривизна, V-дно, водосбор,
расстояние до локального минимума, глубина кармана 3 окна, нормированная высота).
ИТОГ — в конце файла.
"""
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import c2feats as CF  # noqa: E402
import c2lab as L  # noqa: E402
from lab35_targets import from_t, make, to_t, GRID  # noqa: E402


def predictor(kind="abs", obj="q50", drop=(), add=()):
    def fn(tr, va, feats):
        if add:
            tr, va = CF.add_relief(tr), CF.add_relief(va)
        f = [c for c in feats if c not in drop] + [c for c in add if c not in feats]
        yt = to_t(tr, kind)
        ps = [make(obj, d, lr).fit(tr[f], yt).predict(va[f]) for d, lr in GRID]
        return from_t(np.mean(ps, axis=0), va, kind)
    return fn


R = tuple(CF.RELIEF)
VARIANTS = {
    "ref": {},
    "-ident": dict(drop=tuple(CF.IDENTITY)),
    "-dist": dict(drop=("dist_m", "dist_frac")),
    "-z": dict(drop=("z",)),
    "+relief": dict(add=R),
    "-ident+relief": dict(drop=tuple(CF.IDENTITY), add=R),
    "loss-ident+relief": dict(kind="loss", drop=tuple(CF.IDENTITY), add=R),
    "loss-ident": dict(kind="loss", drop=tuple(CF.IDENTITY)),
}


def main():
    ds, sub, feats = L.load()
    only = sys.argv[1:]
    _, ref_dep = L.deploy_profile(predictor(), ds, sub, feats)
    for name, kw in VARIANTS.items():
        if only and name not in only:
            continue
        t = time.time()
        print(name, flush=True)
        fn = predictor(**kw)
        res = L.evaluate(fn, ds, sub, feats)
        raw, dep = L.deploy_profile(fn, ds, sub, feats)
        L.describe(raw, "9583 raw")
        L.describe(dep, "9583 dep")
        c = float(np.corrcoef(dep, ref_dep)[0, 1]) if np.std(dep) > 0 else 0.0
        print(f"RES {name} " + " ".join(f"{k}={v:.4f}" for k, v in res.items()
                                         if not isinstance(v, list))
              + f" V3each={res['V3_each']} corr_ref_dep={c:.3f} ({time.time() - t:.0f}s)",
              flush=True)


if __name__ == "__main__":
    main()
