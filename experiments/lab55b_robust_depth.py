"""Лаборатория, серия 55b: робастные статистики глубины поверх принятых квантилей (lab55).

Гипотеза: сбой одометра после выравнивания ±2-3 м, граница сегмента режет дефект-кластер —
статистики по дефектам с запасом ±3 м за границы сегмента, среднее 3 глубочайших,
число дефектов глубже 20/30%. Новый референс = база + prev_q10/q25/qmed/mean_depth.
ИТОГ: см. конец файла.
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import featlab as L  # noqa: E402
from pipetwin import config as C  # noqa: E402

M = 3.0  # м запаса


def robust(sub, n, wt, ctx):
    seg = pd.DataFrame({"segment_id": np.arange(n)})
    cols = ["rb_min_m3", "rb_q10_m3", "rb_top3", "rb_n20", "rb_n30"]
    if sub is None or sub.empty:
        seg[["rb_min_m3", "rb_q10_m3", "rb_top3"]] = wt
        seg[["rb_n20", "rb_n30"]] = 0.0
        return seg
    d = sub.dropna(subset=["Residual Wall Thickness"])
    x = d["Distance"].to_numpy()
    r = d["Residual Wall Thickness"].to_numpy()
    dep = d["Defect Depth in %"].fillna(0).to_numpy()
    o = np.argsort(x)
    x, r, dep = x[o], r[o], dep[o]
    out = np.full((n, 5), np.nan)
    for s in range(n):
        lo, hi = np.searchsorted(x, s * C.SEG_LEN - M), np.searchsorted(x, (s + 1) * C.SEG_LEN + M)
        if hi > lo:
            rr = r[lo:hi]
            out[s, 0], out[s, 1] = rr.min(), np.quantile(rr, 0.1)
        a, b = np.searchsorted(x, s * C.SEG_LEN), np.searchsorted(x, (s + 1) * C.SEG_LEN)
        if b > a:
            out[s, 2] = np.sort(r[a:b])[:3].mean()
            out[s, 3], out[s, 4] = (dep[a:b] >= 20).sum(), (dep[a:b] >= 30).sum()
    seg[cols] = out
    seg[["rb_min_m3", "rb_q10_m3", "rb_top3"]] = seg[["rb_min_m3", "rb_q10_m3", "rb_top3"]].fillna(wt)
    seg[["rb_n20", "rb_n30"]] = seg[["rb_n20", "rb_n30"]].fillna(0.0)
    return seg


GROUPS = {"margin": ["rb_min_m3", "rb_q10_m3"], "top3": ["rb_top3"], "ndeep": ["rb_n20", "rb_n30"]}


def main():
    ds = L.build(extra_state=robust, tag="lab55b")
    f1 = L.base_feats(ds, "case1")
    assert "prev_q10" in f1
    L.log("ref(q)", L.fmt(L.eval_case1(ds, f1)))
    for name, extra in dict(GROUPS, all=sum(GROUPS.values(), [])).items():
        L.log(name, L.fmt(L.eval_case1(ds, f1 + extra)))


if __name__ == "__main__" and len(sys.argv) == 1:
    main()


def confirm():
    ds = L.build(extra_state=robust, tag="lab55b")
    f1 = L.base_feats(ds, "case1")
    for name in ("top3", "ndeep"):
        L.log(name + "8", L.fmt(L.eval_case1(ds, f1 + GROUPS[name], seeds=L.SEEDS8)))
        res = L.null_case1(ds, f1, GROUPS[name])
        L.log(name, "null", " ".join(f"{r[0]:.4f}/{r[2]:.4f}" for r in res))
    L.log("ref8", L.fmt(L.eval_case1(ds, f1, seeds=L.SEEDS8)))


if __name__ == "__main__" and len(sys.argv) > 1:
    confirm()
