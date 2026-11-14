"""Лаборатория 40 (служебная): кэш компонент бленда кейса 1 для серии калибровки 40-44.

Считает на валидации (train -> val_case1) и на внутреннем CV по train-парам
компоненты боевого бленда: члены ансамбля (lgbm/xgb/aft), q05-пара, классификатор
avg3 по сидам. Внутренний CV (никакой валидации): «скрываем пропуск 2022» —
фолд A: труба 1250022871, все пары с концом 2022-07-06 (у неё других нет);
фолд B: трубы 1250011604 + 1250009490, пары с концом 2022-07-06 (их пары
ввод->2018 остаются в обучении — это прошлое, не утечка). OOF-строки — пары
vtd2vtd 2018->2022 (аналог валидации 2022->2023: прошлый ВТД -> следующий).
Выход: scratch-каталог LAB40_CACHE (по умолчанию experiments/data/lab40_cache.joblib).
"""
import os
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
if os.environ.get("LAB_PROC"):  # честный датасет lab62
    C.PROCESSED_DIR = Path(__file__).resolve().parents[1] / os.environ["LAB_PROC"]
from pipetwin import features as F  # noqa: E402
from pipetwin import train as T  # noqa: E402

SEEDS = tuple(int(s) for s in os.environ.get("LAB40_SEEDS", "42,7,2024,1,2,3,123,777").split(","))
OUT = Path(os.environ.get("LAB40_CACHE",
                          Path(__file__).resolve().parent / "data" / "lab40_cache.joblib"))
END22 = pd.Timestamp("2022-07-06")
FOLDS = {"A": (1250022871,), "B": (1250011604, 1250009490)}


def components(tr, te, feats, cfg, seeds):
    X_tr, y_tr = tr[feats], tr["y"]
    bag = T.fit_bag(X_tr, y_tr, tr["aft_lb"].values, tr["aft_ub"].values,
                    cfg["params"], cfg["aft"], families=cfg["families"])
    out = T.predict_bag(bag, te[feats], te["wt_nom"].values)
    out["q05"] = np.mean([m.predict(te[feats])
                          for m in T.fit_q05_pair(X_tr, y_tr, cfg["params"])], axis=0)
    seed0 = C.SEED
    for s in seeds:
        C.SEED = s
        out[f"p_{s}"] = T.fit_clf(X_tr, tr["had_defect"]).predict_proba(te[feats])[:, 1]
        print("  clf seed", s, flush=True)
    C.SEED = seed0
    keep = ["id", "segment_id", "start", "end", "kind", "y", "wt_nom", "prev_min",
            "prev_min_sm5", "prev_ndef", "had_defect", "age_end"]
    keep = [k for k in keep if k in te.columns]
    return dict(meta=te[keep].reset_index(drop=True), **out)


def main() -> None:
    ds = pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv", parse_dates=["start", "end"])
    ds = T.survival_labels(ds)
    cfg = T.CASES["case1"]
    feats = F.case_features(ds, "case1")
    sub = ds[ds["kind"].isin(cfg["train_kinds"])]
    tr = sub[sub["split"] == "train"]
    va = ds[ds["split"] == cfg["val_split"]]
    cache = {"val": components(tr, va, feats, cfg, SEEDS)}
    print("val готово", flush=True)
    for name, ids in FOLDS.items():
        hold = tr["id"].isin(ids) & (tr["end"] == END22)
        te = tr[hold & (tr["kind"] == "vtd2vtd")]
        cache[f"oof_{name}"] = components(tr[~hold], te, feats, cfg, SEEDS[:3])
        print("fold", name, len(te), flush=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(cache, OUT)
    print("saved", OUT)


if __name__ == "__main__":
    main()
