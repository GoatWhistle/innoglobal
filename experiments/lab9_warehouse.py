"""Лаборатория, серия 9: вклад каждого исправления данных из хранилища.

Сравнивает датасет старого конвейера (чтение CSV, снапшот
experiments/data/train_dataset_legacy_csv.csv.gz) с датасетом из хранилища
(data/processed/train_dataset.csv, собирается run_all.py). Строки совпадают
один к одному, отличаются группы колонок:

  target — y/had_defect: дефекты за концом трубы и дубли в quarantine;
  prev   — признаки прошлого ВТД: глубина ВТД-2018 была записана долей (×100);
  regime — режим: дубли суток, нули давления/температуры -> NaN, сбойные дни;
  grav   — образцы-свидетели: join по направлению теперь совпадает;
  uzt    — УЗТ: все замеры неправдоподобны (толще номинала) -> NaN.

Варианты: legacy, legacy + одна новая группа, warehouse, warehouse − одна группа.
Каждый — на нескольких seed (валидация кейса 1 — 55 сегментов, шум велик).
Запуск: uvx --with-requirements requirements.txt python experiments/lab9_warehouse.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import train as T  # noqa: E402

SEEDS = (42, 7, 123, 2024, 31337)
KEY = ["id", "segment_id", "start", "end", "kind"]
GROUPS = {
    "target": ["y", "had_defect"],
    "prev": [c for c in ("prev_min", "prev_min_sm5", "prev_min_sm21", "prev_p25_sm21",
                         "prev_ndef", "prev_ndef_sm21", "prev_ndef_norm", "prev_maxdepth",
                         "prev_loss_rate")],
    "regime": ["rg_watercut_mean", "rg_watercut_p90", "rg_v_mean", "rg_v_p10", "rg_share_slow",
               "rg_gas_mean", "rg_p_mean", "rg_t_mean", "rg_pit_mean", "rg_pit_cum", "rg_q_mean",
               "x_pool_slow", "x_trap_wc"],
    "grav": ["grav_rate_mean", "grav_rate_max", "grav_cl", "grav_mineralization"],
    "uzt": ["uzt_dist", "uzt_min_250", "uzt_loss_rate"],
}
# предиктор, который реально сдаётся (predict.PREDICTOR)
REPORTED = {"case1": "ensemble_smooth5", "case2": "ensemble"}


def load() -> tuple[pd.DataFrame, pd.DataFrame]:
    legacy = pd.read_csv(ROOT / "experiments/data/train_dataset_legacy_csv.csv.gz",
                         parse_dates=["start", "end"])
    wh = pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv", parse_dates=["start", "end"])
    assert (legacy[KEY].values == wh[KEY].values).all(), "строки датасетов не совпадают"
    return legacy, wh


def mix(base: pd.DataFrame, donor: pd.DataFrame, groups: list[str]) -> pd.DataFrame:
    ds = base.copy()
    for g in groups:
        for col in GROUPS[g]:
            ds[col] = donor[col].values
    return ds


def evaluate(ds: pd.DataFrame, seed: int) -> dict[str, float]:
    """Валидационная часть train.run для одного seed: r² сдаваемого предиктора."""
    C.SEED = seed
    ds = T.survival_labels(ds)
    out = {}
    for case, cfg in T.CASES.items():
        feats = F.case_features(ds, case)
        sub = ds[ds["kind"].isin(cfg["train_kinds"])]
        tr, va = sub[sub["split"] == "train"], ds[ds["split"] == cfg["val_split"]]
        preds = []
        for fam in T.MODEL_FAMILIES:
            m = T.make_model(fam)
            m.fit(tr[feats], tr["y"])
            preds.append(m.predict(va[feats]))
        aft = T.fit_aft(tr[feats], tr["aft_lb"].values, tr["aft_ub"].values, **cfg["aft"])
        preds.append(va["wt_nom"].values - aft.predict(xgboost.DMatrix(va[feats])))
        p = np.mean(preds, axis=0)
        if REPORTED[case].endswith("smooth5"):
            p = (pd.DataFrame({"id": va["id"].values, "p": p}).groupby("id")["p"]
                 .transform(lambda s: s.rolling(5, center=True, min_periods=1).median()).values)
        out[case] = T.pearson_r2(va["y"].values, p)
        out[f"{case}_mae"] = float(np.mean(np.abs(va["y"].values - p)))
    return out


def main() -> None:
    legacy, wh = load()
    variants = {"legacy": legacy}
    for g in GROUPS:
        variants[f"legacy + {g}"] = mix(legacy, wh, [g])
    variants["warehouse"] = wh
    for g in GROUPS:
        variants[f"warehouse - {g}"] = mix(wh, legacy, [g])

    rows = []
    for name, ds in variants.items():
        for seed in SEEDS:
            r = evaluate(ds, seed)
            rows.append(dict(variant=name, seed=seed, **r))
        last = pd.DataFrame(rows).query("variant == @name")
        print(f"{name:22s} case1 {last.case1.mean():.3f}±{last.case1.std():.3f}  "
              f"case2 {last.case2.mean():.3f}±{last.case2.std():.3f}", flush=True)

    res = pd.DataFrame(rows)
    out = ROOT / "experiments" / "lab9_warehouse_results.csv"
    res.to_csv(out, index=False)
    summary = res.groupby("variant", sort=False).agg(
        case1_r2=("case1", "mean"), case1_sd=("case1", "std"), case1_mae=("case1_mae", "mean"),
        case2_r2=("case2", "mean"), case2_sd=("case2", "std"), case2_mae=("case2_mae", "mean"))
    print("\n" + summary.round(4).to_string())


if __name__ == "__main__":
    main()
