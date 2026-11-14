"""Лаборатория, серия 31 (замер): мерж ml-pipetwin-merge-case-2 на базе lab20-21.

Датасеты-варианты собирает lab30_merge_build.py (env: сдвиг кейса 1 match/corr, оракул,
УЗТ corr/raw, match на всех парах). Здесь на каждом датасете путь валидации train.run:
база LGBM+XGB+AFT 300/0.1 (детерминирована — обучается один раз), q05-пара, классификатор
AvgClf на каждом сиде -> ens_blend; aligned_stats; ens_blend+stats с весом stats из
фиксированной сетки STATS_W (заданной до замера, не подбирается на 55 сегментах);
варианты признаков: +stats внутрь базы и/или классификатора (FEATS_MODES).
Кейс 2 (LGBM по сетке PARAM_GRID, детерминирован) — один раз на датасет.

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
    base_feats = F.case_features(ds, "case1")
    sub = ds[ds["kind"].isin(cfg["train_kinds"])]
    tr, va = sub[sub["split"] == "train"], ds[ds["split"] == cfg["val_split"]]
    y_tr, y_va = tr["y"], va["y"].values
    stats = T.aligned_stats_score(va)

    def add(variant, seed, p):
        rows.append(dict(tag=tag, case="case1", variant=variant, seed=seed,
                         r2=T.pearson_r2(y_va, p), mae=mae(y_va, p)))

    add("aligned_stats", 0, stats)
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
    piv["mae"] = df.groupby(["case", "tag", "variant"])["mae"].mean().round(3)
    pd.set_option("display.width", 200)
    print(piv.to_string())


if __name__ == "__main__":
    main()
