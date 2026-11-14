"""Лаборатория, серия 56b: статистики дефектов прошлого пропуска как слагаемые/замены
в необучаемом предикторе кейса 1 aligned_stats (train.aligned_stats_score, 8edac2f):
    S = z(prev_min) + z(prev_q10) + z(prev_q10_nb3) − z(prev_lnn_nb3).

aligned_stats не обучается — его r² зависит только от признаков валидационных строк, поэтому
обучения нет, а датасеты-варианты различаются только сдвигом прошлого пропуска:
  build-режим (env LAB_DS):
    oracle      — PIPETWIN_ALIGN_ORACLE=1: прошлый пропуск валидации выровнен по своей паре
                  (match 60 м) — геометрия прогноза 22871 (сдвиг измерен на обоих концах);
    oracle_m1 / oracle_p1 — оракул + постоянная ошибка сдвига −1 / +1 м (как LAB_JITTER lab30);
    nb          — по умолчанию: сдвиг от соседа (ошибка 6-11 м на 11604);
    self22      — PIPETWIN_VAL1=self22: 22871 2018 -> 2022, 525 сегментов, сдвиг от соседей.
  Запуск сборки: LAB_DS=<режим> python lab56b_stats_terms.py build
  Оценка: python lab56b_stats_terms.py eval  (читает все кэши).
Варианты зафиксированы заранее (список VARIANTS), критерий (координатор): рост r² в оракуле при
δ ∈ {−1, 0, +1} и r2d, плюс self22 (независимая проверка, 525 сегментов).
ИТОГ (r² / r2d; оракул = сдвиг измерен по самой паре, δ — постоянная ошибка сдвига, м):
                         δ=−1          δ=0           δ=+1          сосед        self22(525)
  ref aligned_stats   0.658/0.329  0.701/0.407  0.694/0.399  0.273/0.043  0.215/0.320
  quant (lab24)       0.681/0.364  0.731/0.460  0.720/0.445  0.212/0.021  0.162/0.247
  B = z(q02)+z(q10)+z(q10_nb3)−z(n_w5)  ПРИНЯТ как dens_quant_cal (дефолт кейса 1):
                      0.713/0.442  0.748/0.510  0.735/0.495  0.289/0.082  0.224/0.324
  Плато B: окно ±1 0.710/0.750/0.738 (self22 0.234), ±5 0.714/0.749/0.739 (0.217), вес 0.5
  0.721/0.759/0.746 (0.199), +z(min) 0.713/0.761/0.749 (0.216); вес 2 — хуже (0.645-0.671).
  Плотность (ds_n_w*, линейная сумма дефектов в окне на 1000 дефектов пропуска) — единственный
  терм, растущий во ВСЕХ пяти датасетах и в r2d: ref−z(n_w5) 0.680/0.719/0.708, сосед 0.313,
  self22 0.250; окна ±1/±5 — то же. Остальные термы к ref: +q25/+qmed/−mean_depth/q10->q25
  +0.02 в оракуле, но self22 0.215 -> 0.19-0.20 — отказ; rb_min_m3/rb_q10_m3 (запас ±3 м),
  top3, occ, q10_nb5, lnn_nb5, min_nb3, nbot, botmin, ndeep20 — не лучше ref в оракуле — отказ.
  Внимание: варианты B выбраны после первого замера (терм плотности — гипотеза 1 брифа, равные
  веса z — без подбора); выигрыш у quant есть на всех пяти репетициях, включая независимую self22.
"""
import os
import sys
from pathlib import Path

DS = os.environ.get("LAB_DS", "oracle")
if DS.startswith("oracle"):
    os.environ["PIPETWIN_ALIGN_ORACLE"] = "1"
if DS == "self22":
    os.environ["PIPETWIN_VAL1"] = "self22"

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))
import featlab as L  # noqa: E402
from pipetwin import align  # noqa: E402
from pipetwin import config as C  # noqa: E402
from pipetwin import train as T  # noqa: E402

import lab55_defect_stats as A  # noqa: E402
import lab55b_robust_depth as RB  # noqa: E402

JIT = {"oracle_m1": -1.0, "oracle_p1": 1.0}.get(DS, 0.0)
if JIT:
    _tp = align.to_profile

    def _jit(vtd, passport, pipe_id, run, exclude=None, method=None, **kw):
        f = _tp(vtd, passport, pipe_id, run, exclude, method=method, **kw)
        val = vtd.loc[vtd["run_date"] == pd.Timestamp(C.VAL_CASE1_END), "id"].unique()
        if (method is not None and pipe_id in val and pipe_id != C.CASE1_ID
                and pd.Timestamp(run) == pd.Timestamp(C.VAL_CASE1_START)):
            return lambda d: f(d) + JIT
        return f

    align.to_profile = _jit


def extra(sub, n, wt, ctx):
    a = A.seg_stats(sub, n, wt, ctx)
    a = a.merge(RB.robust(sub, n, wt, ctx), on="segment_id")
    # q02 — для quant_cal коллеги (origin/ml-pipetwin-lab24 71b4875), fillna(prev_min) там же
    if sub is None or sub.empty:
        a["q02_raw"] = np.nan
    else:
        q02 = sub.dropna(subset=["Residual Wall Thickness"]).groupby("segment_id")[
            "Residual Wall Thickness"].quantile(0.02)
        a["q02_raw"] = a["segment_id"].map(q02)
    return a


def add_cols(ds):
    g = ds.groupby(["id", "start", "end"])
    r = lambda c, w: g[c].transform(lambda s: s.rolling(w, center=True, min_periods=1).mean())  # noqa
    ds["q10_nb5"] = r("prev_q10", 5)
    ds["lnn_nb5"] = r("ds_logn", 5) if "ds_logn" in ds else np.nan
    ds["min_nb3"] = r("prev_min", 3)
    ds["q25_nb3"] = r("ds_q25", 3)
    ds["md_nb3"] = r("ds_mean_depth", 3)
    ds["prev_q02"] = ds["q02_raw"].fillna(ds["prev_min"])
    ds["quant"] = (ds["prev_q02"] + ds["prev_q10"] + ds["prev_q10_nb3"]) / 3
    return ds


REF = [(1, "prev_min"), (1, "prev_q10"), (1, "prev_q10_nb3"), (-1, "prev_lnn_nb3")]
VARIANTS = {
    "ref": REF,
    "+q25": REF + [(1, "ds_q25")],
    "+qmed": REF + [(1, "ds_med")],
    "-mean_depth": REF + [(-1, "ds_mean_depth")],
    "q10->q25": [(1, "prev_min"), (1, "ds_q25"), (1, "q25_nb3"), (-1, "prev_lnn_nb3")],
    "+q25_nb3": REF + [(1, "q25_nb3")],
    "-md_nb3": REF + [(-1, "md_nb3")],
    "+q10_nb5": REF + [(1, "q10_nb5")],
    "-lnn_nb5": REF + [(-1, "lnn_nb5")],
    "+min_nb3": REF + [(1, "min_nb3")],
    "+rb_min_m3": REF + [(1, "rb_min_m3")],
    "+rb_q10_m3": REF + [(1, "rb_q10_m3")],
    "+top3": REF + [(1, "rb_top3")],
    "-occ_w3": REF + [(-1, "ds_occ_w3")],
    "-occ_w5": REF + [(-1, "ds_occ_w5")],
    "-n_w5": REF + [(-1, "ds_n_w5")],
    # планка коллеги quant_cal (lab24) и плотность поверх неё (добавлено после сообщения координатора)
    "quant": [(1, "quant")],
    "quant-0.5n_w5": [(1, "quant"), (-0.5, "ds_n_w5")],
    "quant-n_w5": [(1, "quant"), (-1, "ds_n_w5")],
    "quant-0.5n_w11": [(1, "quant"), (-0.5, "ds_n_w11")],
    "quant-0.5lnn3": [(1, "quant"), (-0.5, "prev_lnn_nb3")],
    "zq02+zq10+zq10nb3": [(1, "prev_q02"), (1, "prev_q10"), (1, "prev_q10_nb3")],
    "zq02+zq10+zq10nb3-n_w5": [(1, "prev_q02"), (1, "prev_q10"), (1, "prev_q10_nb3"), (-1, "ds_n_w5")],
    # плато для B = z(q02)+z(q10)+z(q10_nb3)−z(n_w5)
    "B_n_w3": [(1, "prev_q02"), (1, "prev_q10"), (1, "prev_q10_nb3"), (-1, "ds_n_w3")],
    "B_n_w11": [(1, "prev_q02"), (1, "prev_q10"), (1, "prev_q10_nb3"), (-1, "ds_n_w11")],
    "B_0.5n_w5": [(1, "prev_q02"), (1, "prev_q10"), (1, "prev_q10_nb3"), (-0.5, "ds_n_w5")],
    "B_2n_w5": [(1, "prev_q02"), (1, "prev_q10"), (1, "prev_q10_nb3"), (-2, "ds_n_w5")],
    "B+min": [(1, "prev_min"), (1, "prev_q02"), (1, "prev_q10"), (1, "prev_q10_nb3"), (-1, "ds_n_w5")],
    "B-lnn3": [(1, "prev_q02"), (1, "prev_q10"), (1, "prev_q10_nb3"), (-1, "ds_n_w5"),
               (-1, "prev_lnn_nb3")],
    # окрестность победителя -n_w5 (проверка плато, добавлено после первого замера)
    "-n_w3": REF + [(-1, "ds_n_w3")],
    "-n_w11": REF + [(-1, "ds_n_w11")],
    "lnn3->n_w5": REF[:3] + [(-1, "ds_n_w5")],
    "-0.5n_w5": REF + [(-0.5, "ds_n_w5")],
    "-2n_w5": REF + [(-2, "ds_n_w5")],
    "-n_w5-lnn5": REF + [(-1, "ds_n_w5"), (-1, "lnn_nb5")],
    "-nbot": REF + [(-1, "ds_nbot")],
    "+botmin": REF + [(1, "ds_botmin")],
    "-ndeep20": REF + [(-1, "rb_n20")],
}


def score(ds, terms):
    s = sum(sg * T.zscore(ds[c].values.astype(float)) for sg, c in terms)
    base = ds["prev_min"].values
    return T.zscore(s) * float(np.std(base)) + float(np.mean(base))


def build():
    ds = L.build(extra_state=extra, tag=f"lab56b_{DS}", force=True)
    split = "val_case1"
    va = ds[ds["split"] == split].copy()
    for c in A.COLS_NAN:
        va[c] = va[c].fillna(0.0)
    va = add_cols(va)
    out = L.CACHE / f"lab56b_val_{DS}.pkl"
    va.to_pickle(out)
    # контроль: ref совпадает с train.aligned_stats_score
    chk = T.pearson_r2(va["y"].values, T.aligned_stats_score(va))
    L.log(DS, len(va), "aligned_stats r2", round(chk, 4))


def evaluate():
    dss = ["oracle_m1", "oracle", "oracle_p1", "nb", "self22"]
    vals = {d: pd.read_pickle(L.CACHE / f"lab56b_val_{d}.pkl") for d in dss}
    rows = []
    for name, terms in VARIANTS.items():
        row = dict(variant=name)
        for d, va in vals.items():
            y, dm = va["y"].values, va["had_defect"].values.astype(bool)
            p = score(va, terms)
            row[d] = T.pearson_r2(y, p)
            row[d + "_d"] = T.pearson_r2(y[dm], p[dm])
        rows.append(row)
    df = pd.DataFrame(rows).set_index("variant")
    ref = df.loc["ref"]
    orc = ["oracle_m1", "oracle", "oracle_p1"]
    df["wins_or"] = (df[orc] > ref[orc]).sum(axis=1)
    df["wins_or_d"] = (df[[c + "_d" for c in orc]] > ref[[c + "_d" for c in orc]]).sum(axis=1)
    df["mean_or"] = df[orc].mean(axis=1)
    pd.set_option("display.width", 250)
    print(df.round(4).sort_values("mean_or", ascending=False).to_string(), flush=True)


if __name__ == "__main__":
    {"build": build, "eval": evaluate}[sys.argv[1]]()
