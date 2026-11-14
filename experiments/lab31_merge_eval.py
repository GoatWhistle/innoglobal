"""Лаборатория, серии 31-32 (замер): мерж ml-pipetwin-merge-case-2 на базе lab20-21.

Датасеты-варианты собирает lab30_merge_build.py (env: сдвиг кейса 1 corr / match 250 м /
match 60 м кусочный, оракул, ошибка сдвига LAB_JITTER, УЗТ corr/raw, match на всех парах).
Здесь на каждом датасете путь валидации train.run: база LGBM+XGB+AFT 300/0.1 (детерминирована),
q05-пара, AvgClf на каждом сиде -> ens_blend; aligned_stats; ens_blend+stats с весом из
фиксированной сетки STATS_W (не подбирается: принят вес 1.0 коллеги); STAT_FEATS внутрь
базы/классификатора (FEATS_MODES). r2d — r² только на дефектных сегментах (53 из 55).

!!! ИТОГ НИЖЕ (серии 31-32) — на УТЁКШЕЙ валидации (train-строки «… -> 2022» труб валидации
выровнены через скрытый 2023, exp/newmodels lab54). Честный пересмотр — серия 34 (в конце).

ИТОГ 31-32 (утечка; 3 сида 42/7/2024, финалисты 8 сидов; r2 / r2d):
  Сдвиг кейса 1, «от соседа», ens_blend: corr 0.619/0.23 (референс) -> match250 0.641/0.27
    -> match60 0.693/0.39 (8/8 сидов). Принят match60 (коллега, 0a296d9).
  Оракул (сдвиг по своей паре): ens_blend ~0.58-0.60, aligned_stats 0.661/0.676/0.701
    (corr/250/60), ens_blend+stats 0.654/0.671/0.690.
  STAT_FEATS внутрь базы (LGBM/XGB/AFT/q05): ПРИНЯТО — рост на всех 6 датасетах, 8/8 сидов:
    от соседа m60 0.693 -> 0.695 (r2d 0.387 -> 0.394), corr 0.619 -> 0.663 (r2d 0.23 -> 0.33),
    оракул m60 ens_blend 0.599 -> 0.661, ens_blend+stats 0.690 -> 0.708 (r2d 0.375 -> 0.412).
  STAT_FEATS в классификатор: ОТКАЗ (±0.005, шум).
  Ошибка сдвига (оракул m60 + δ, stats_in_base): ens_blend+stats при |δ| <= 1 м 0.682-0.703
    (r2d 0.36-0.40) — лучше aligned_stats (0.658-0.694, r2d 0.33-0.40) и ens_blend
    (0.651-0.660, r2d 0.30-0.32) при каждом δ; при |δ| = 2 м 0.662/0.666 против 0.62 у stats.
    От соседа (ошибка 6-11 м) ens_blend+stats 0.54 против ens_blend 0.695.
    => дефолт прогноза 22871 (сдвиг известен на обоих концах, ошибка интерполяции ~1 м):
    ens_blend+stats на базе со STAT_FEATS. aligned_stats дефолтом коллеги — отказ
    (хуже бленда при любой ошибке сдвига, кроме δ=0 в пределах 0.007).
  Вес stats {0.5, 1, 2}: w=2 +0.004 при |δ|<=1, хуже при |δ|=2 и от соседа — оставлен 1.0.
  self22 (22871 2018->2022, 525 сегм.): ens_blend ~0.01 (пропуск 2018 — иной снаряд,
    вне распределения), но r²(prev_min) corr 0.077 -> match 0.163 (= оракул): match-сдвиг на
    геометрии «интерполяция между концами» ≈ оракулу.
  Кейс 2: УЗТ с компенсацией офсета 0.1813 -> 0.1934 (strict 0.0098 -> 0.0163), MAE
    0.861 -> 0.932 — принято (уровень всё равно калибруется в predict); match на всех парах
    0.1485 — отказ.

СЕРИЯ 34 — ЧЕСТНО (датасеты LAB_HONEST=1, lab30; 3 сида; r2 / r2d):
  ens_blend: сосед corr 0.226/0.06 -> m60 0.281/0.11 (match-сдвиг полезен и честно);
    оракул m60 0.271/0.07, оракул±1 м 0.26-0.27 — бленд держался на утечке.
  aligned_stats(_cal): сосед m60 0.273/0.04; оракул 0.701/0.41; оракул + δ ∈ {−1,−0.5,+0.5,+1} м
    0.658/0.665/0.690/0.694 (r2d 0.33-0.40); δ=±2 0.622/0.619.
  ens_blend+stats w=1 / w=2 при |δ|<=1: 0.54-0.57 / 0.61-0.65 — хуже aligned_stats при каждом δ,
    вес stats монотонно «больше = лучше» => бленд ОТОЗВАН, дефолт кейса 1 = aligned_stats_cal
    (как в 8edac2f) — подтверждён честно.
  STAT_FEATS в базу: сосед m60 0.281 -> 0.241, corr 0.226 -> 0.211, оракул 0.271 -> 0.296 — ОТКАЗ.
  stats + 0.25·z(−P): 0.641-0.678 при |δ|<=1 (−0.015 к stats) — ОТКАЗ; 0.5 — хуже.
  Сглаживание stats (медиана 3/5): оракул 0.701 -> 0.652/0.395 — ОТКАЗ.
  Сглаживание ens_blend sm5 (honest): сосед m60 0.281 -> 0.213, оракул 0.27 -> 0.34 — для ens_blend
    неоднозначно; дефолт его не использует.
Запуск: python experiments/lab31_merge_eval.py <ds_root> <out.csv> --tags a,b --seeds 42,7,2024
        [--feats base,stats_in_all] [--no-case2] [--threads 4]
"""
import argparse
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import train as T  # noqa: E402

SMOOTH_K = (3, 5)
P_W = (0.25, 0.5)
STATS_W = (0.5, 1.0, 2.0)  # вес z(stats) относительно z(ens_blend); 1.0 — как у коллеги
FEATS_MODES = {
    "base": (False, False),          # (stats в базе, stats в классификаторе)
    "stats_in_base": (True, False),
    "stats_in_clf": (False, True),
    "stats_in_all": (True, True),
}


def mae(y, p):
    return float(np.mean(np.abs(y - p)))


def blend_w(ens, stats, w):
    b = T.zscore(ens) + w * T.zscore(stats)
    return T.zscore(b) * float(np.std(ens)) + float(np.mean(ens))


def eval_case1(ds, tag, seeds, modes, rows):
    cfg = T.CASES["case1"]
    base_feats = [f for f in F.case_features(ds, "case1") if f not in F.STAT_FEATS]
    sub = ds[ds["kind"].isin(cfg["train_kinds"])]
    tr, va = sub[sub["split"] == "train"], ds[ds["split"] == cfg["val_split"]]
    y_tr, y_va = tr["y"], va["y"].values
    stats = T.aligned_stats_score(va)
    dm = va["had_defect"].values.astype(bool)  # r2d: только дефектные сегменты (без чистых 11604 #36-37)

    def add(variant, seed, p):
        rows.append(dict(tag=tag, case="case1", variant=variant, seed=seed,
                         r2=T.pearson_r2(y_va, p), r2d=T.pearson_r2(y_va[dm], p[dm]),
                         mae=mae(y_va, p)))

    add("aligned_stats", 0, stats)

    def smooth(p, k):
        return (pd.DataFrame({"id": va["id"].values, "p": p}).groupby("id")["p"]
                .transform(lambda q: q.rolling(k, center=True, min_periods=1).median()).values)

    for k in SMOOTH_K:  # lab34: сглаживание формы stats (фиксированная сетка)
        add(f"aligned_stats_sm{k}", 0, smooth(stats, k))
    cache = {}
    for mode in modes:
        in_base, in_clf = FEATS_MODES[mode]
        fb = base_feats + (F.STAT_FEATS if in_base else [])
        fc = base_feats + (F.STAT_FEATS if in_clf else [])
        if in_base not in cache:
            C.SEED = 42
            bag = T.fit_bag(tr[fb], y_tr, tr["aft_lb"].values, tr["aft_ub"].values,
                            cfg["params"], cfg["aft"], families=cfg["families"])
            ens = T.predict_bag(bag, va[fb], va["wt_nom"].values)["ensemble"]
            q05 = np.mean([m.predict(va[fb])
                           for m in T.fit_q05_pair(tr[fb], y_tr, cfg["params"])], axis=0)
            cache[in_base] = (ens, q05)
        ens, q05 = cache[in_base]
        if mode == "base":
            add("ensemble", 0, ens)
        for seed in seeds:
            C.SEED = seed
            p = T.fit_clf(tr[fc], tr["had_defect"]).predict_proba(va[fc])[:, 1]
            eb = T.blend_prob(ens, p, cfg["blend_w"], gap=ens - q05, gap_w=cfg["gap_w"])
            add(f"{mode}:ens_blend", seed, eb)
            for w in STATS_W:
                add(f"{mode}:ens_blend+stats{w:g}", seed, blend_w(eb, stats, w))
            for k in SMOOTH_K:
                add(f"{mode}:ens_blend_sm{k}", seed, smooth(eb, k))
            for w in P_W:  # lab34: stats + малая доля формы классификатора
                add(f"{mode}:stats+P{w:g}", seed, blend_w(stats, -p, w))
            print(f"  {tag} {mode} seed {seed}: ens_blend {T.pearson_r2(y_va, eb):.4f} "
                  f"+stats1 {T.pearson_r2(y_va, blend_w(eb, stats, 1.0)):.4f}", flush=True)
    C.SEED = 42


def eval_case2(ds, tag, rows):
    cfg = T.CASES["case2"]
    feats = F.case_features(ds, "case2")
    sub = ds[ds["kind"].isin(cfg["train_kinds"])]
    tr, va = sub[sub["split"] == "train"], ds[ds["split"] == cfg["val_split"]]
    y_va = va["y"].values
    for strict in (False, True):
        t = tr[~tr["id"].isin(va["id"].unique())] if strict else tr
        bag = [m for p in cfg["param_grid"] for m in T.fit_bag(
            t[feats], t["y"], t["aft_lb"].values, t["aft_ub"].values, p, None,
            families=cfg["families"])]
        pr = T.predict_bag(bag, va[feats], va["wt_nom"].values)["ensemble"]
        rows.append(dict(tag=tag, case="case2", variant="lgbm_grid" + ("_strict" if strict else ""),
                         seed=0, r2=T.pearson_r2(y_va, pr), mae=mae(y_va, pr)))
        print(f"  {tag} case2 strict={strict}: {rows[-1]['r2']:.4f}", flush=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("root")
    ap.add_argument("out")
    ap.add_argument("--tags", required=True)
    ap.add_argument("--seeds", default="42,7,2024")
    ap.add_argument("--feats", default="base")
    ap.add_argument("--no-case2", action="store_true")
    ap.add_argument("--no-case1", action="store_true")
    a = ap.parse_args()
    seeds = [int(s) for s in a.seeds.split(",")]
    rows = []
    for tag in a.tags.split(","):
        t0 = time.time()
        ds = pd.read_csv(Path(a.root) / tag / "train_dataset.csv", parse_dates=["start", "end"])
        ds = T.survival_labels(ds)
        if not a.no_case1:
            eval_case1(ds, tag, seeds, a.feats.split(","), rows)
        if not a.no_case2:
            eval_case2(ds, tag, rows)
        print(f"{tag} готово за {time.time() - t0:.0f} c", flush=True)
        pd.DataFrame(rows).to_csv(a.out, index=False)
    df = pd.DataFrame(rows)
    piv = df.pivot_table(index=["case", "tag", "variant"], columns="seed", values="r2").round(4)
    piv["mean"] = piv.mean(axis=1).round(4)
    piv["min"] = piv.min(axis=1).round(4)
    piv["r2d"] = df.groupby(["case", "tag", "variant"])["r2d"].mean().round(4)
    piv["mae"] = df.groupby(["case", "tag", "variant"])["mae"].mean().round(3)
    pd.set_option("display.width", 200)
    print(piv.to_string())


if __name__ == "__main__":
    main()
