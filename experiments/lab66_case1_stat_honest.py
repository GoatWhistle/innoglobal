"""Лаборатория, серия 66 (интеграция): честная проверка предикторов кейса 1 без обучения —
aligned_stats (8edac2f), quant (ml-pipetwin-lab24), dens_quant (exp/feats lab56b).

Предикторы не обучаются, их r² от утечки выравнивания не зависит; зависят только от сдвига
прошлого пропуска. Датасеты — lab30_merge_build.py с LAB_HONEST=1: сосед (m60), оракул (сдвиг по
своей паре), оракул + ошибка δ ∈ {±0.5, ±1, ±2} м (LAB_JITTER; у 22871 ошибка интерполяции ~1 м),
self22 (22871 2018 -> 2022, 525 сегм., сдвиг от соседей с обоих концов — геометрия прогноза).
_cal-версии (в уровне ens_blend) имеют тот же r². r2d — r² по дефектным сегментам.
Запуск: python experiments/lab66_case1_stat_honest.py <ds_root> --tags d_m60,d_m60_or,...
"""
import argparse
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import train as T  # noqa: E402

PRED = {"aligned_stats": T.aligned_stats_score, "quant": T.quant_score,
        "dens_quant": T.dens_quant_score}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root")
    ap.add_argument("--tags", required=True)
    a = ap.parse_args()
    rows = []
    for tag in a.tags.split(","):
        ds = pd.read_csv(Path(a.root) / tag / "train_dataset.csv")
        va = ds[ds["split"] == "val_case1"]
        y, dm = va["y"].values, va["had_defect"].values.astype(bool)
        for name, fn in PRED.items():
            p = fn(va)
            rows.append(dict(tag=tag, pred=name, r2=T.pearson_r2(y, p),
                             r2d=T.pearson_r2(y[dm], p[dm])))
    df = pd.DataFrame(rows)
    print(df.pivot(index="tag", columns="pred", values="r2").round(4).to_string())
    print(df.pivot(index="tag", columns="pred", values="r2d").round(4).to_string())


if __name__ == "__main__":
    main()
