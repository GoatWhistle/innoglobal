"""Лаборатория, серия 20: пересвип бленда кейса 1 после выравнивания ВТД (align.py).

Проблема: веса бленда (blend_w=1.0, gap_w=0.5), исключение CatBoost (lab16) и сам
gap-член (lab19) подбирались на НЕвыровненной валидации со сглаживанием. После
приведения пропусков к координатам профиля (PIPETWIN_ALIGN=profile) структура
ошибки другая: пик стоит на месте, сглаживание отключено — старый тюнинг может
не переноситься.

Протокол: сетка blend_w × gap_w × состав базы на 3 сидах (42/7/2024), финалисты —
подтверждение на 8 сидах (+1/2/3/123/777). Метрика — r² Пирсона ens_blend на
val_case1 без сглаживания. База детерминирована (считается один раз на состав),
от сида зависят CatBoost-классификатор и CatBoost в базе (если включён).

Результаты (2026-11-14, выровненный train_dataset):
  - оптимум blend_w уехал 1.0 -> плато 2.0-2.5: на выровненных данных форма
    классификатора ценнее уровня базы (7/8 сидов, +0.026 к среднему);
    взято 2.0 — у 2.5 прирост +0.0008, но худший сид проседает 0.313 -> 0.301;
  - gap_w=0.5 полезен при больших blend_w (0.501 -> 0.512 на 3 сидах),
    при blend_w=1.0 на выровненных данных ВРЕДИЛ;
  - возврат CatBoost в базу НЕ подтверждён: на 3 сидах выигрывал,
    на 8 — 4/8 против той же базы без него, lab16 в силе;
  - чистый классификатор −P без базы даёт 0.45 — база добавляет ~0.09.
Принято: blend_w=2.0, gap_w=0.5, база LGBM+XGB+AFT; боевой r² 0.494 -> 0.537.
Запуск: uvx --with-requirements requirements.txt python experiments/lab20_align_resweep.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin.train import (CASES, blend_prob, fit_bag, fit_clf, fit_q05_pair,  # noqa: E402
                            pearson_r2, predict_bag, survival_labels)

BASES = {
    "lgbm+xgb+aft": ("lgbm", "xgb"),
    "lgbm+xgb+cb+aft": ("lgbm", "xgb", "catboost"),
}
SEEDS_GRID = (42, 7, 2024)
SEEDS_CONFIRM = (42, 7, 2024, 1, 2, 3, 123, 777)
BLEND_W = (0.5, 1.0, 1.5, 1.75, 2.0, 2.5, 3.0)
GAP_W = (0.0, 0.25, 0.5, 0.75)


def main() -> None:
    ds = pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv", parse_dates=["start", "end"])
    ds = survival_labels(ds)
    cfg = CASES["case1"]
    feats = F.case_features(ds, "case1")
    subset = ds[ds["kind"].isin(cfg["train_kinds"])]
    tr = subset[subset["split"] == "train"]
    va = ds[ds["split"] == cfg["val_split"]]
    X_tr, y_tr = tr[feats], tr["y"]
    X_va, y_va = va[feats], va["y"].values

    q05 = np.mean([m.predict(X_va) for m in fit_q05_pair(X_tr, y_tr)], axis=0)

    def ensemble(fams: tuple, seed: int) -> np.ndarray:
        C.SEED = seed
        bag = fit_bag(X_tr, y_tr, tr["aft_lb"].values, tr["aft_ub"].values,
                      {}, cfg["aft"], families=fams)
        return predict_bag(bag, X_va, va["wt_nom"].values)["ensemble"]

    def clf_p(seed: int) -> np.ndarray:
        C.SEED = seed
        return fit_clf(X_tr, tr["had_defect"]).predict_proba(X_va)[:, 1]

    def sweep(seeds) -> pd.DataFrame:
        rows = []
        for bname, fams in BASES.items():
            # без CatBoost база детерминирована — один расчёт на все сиды
            det = "catboost" not in fams
            ens0 = ensemble(fams, seeds[0]) if det else None
            for seed in seeds:
                ens = ens0 if det else ensemble(fams, seed)
                p = clf_p(seed)
                if bname == "lgbm+xgb+aft":
                    rows.append(dict(base="clf_only", seed=seed, blend_w=np.inf,
                                     gap_w=0.0, r2=pearson_r2(y_va, -p)))
                for bw in BLEND_W:
                    for gw in GAP_W:
                        pred = blend_prob(ens, p, bw, gap=ens - q05, gap_w=gw)
                        rows.append(dict(base=bname, seed=seed, blend_w=bw,
                                         gap_w=gw, r2=pearson_r2(y_va, pred)))
                print(f"{bname} seed {seed}: готово", flush=True)
        return pd.DataFrame(rows)

    print("=== сетка на 3 сидах ===", flush=True)
    df = sweep(SEEDS_GRID)
    piv = (df.groupby(["base", "blend_w", "gap_w"])["r2"]
           .agg(["mean", "min", "max"]).round(4).reset_index()
           .sort_values("mean", ascending=False))
    print(piv.head(20).to_string(index=False), flush=True)

    print("\n=== подтверждение финалистов на 8 сидах ===", flush=True)
    df8 = sweep(SEEDS_CONFIRM)
    finals = {
        "ref  bw1.0 gw0.5 nocb": ("lgbm+xgb+aft", 1.0, 0.5),
        "bw2.0 gw0.5 nocb (принят)": ("lgbm+xgb+aft", 2.0, 0.5),
        "bw2.5 gw0.5 nocb": ("lgbm+xgb+aft", 2.5, 0.5),
        "bw2.5 gw0.5 cb": ("lgbm+xgb+cb+aft", 2.5, 0.5),
    }
    ref = None
    for name, (b, bw, gw) in finals.items():
        s = (df8[(df8.base == b) & (df8.blend_w == bw) & (df8.gap_w == gw)]
             .set_index("seed")["r2"])
        if ref is None:
            ref = s
            print(f"{name}: mean {s.mean():.4f} min {s.min():.4f} REF")
            continue
        wins = int((s > ref).sum())
        print(f"{name}: mean {s.mean():.4f} min {s.min():.4f} "
              f"побед над ref {wins}/{len(s)} прирост {float((s - ref).mean()):+.4f}")
    C.SEED = 42


if __name__ == "__main__":
    main()
