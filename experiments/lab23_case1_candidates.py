"""Лаборатория, серия 23: выбор предиктора кейса 1 по трём валидациям и полному набору метрик.

Проблема: валидация кейса 1 — 55 сегментов, а её режим «сдвиг от соседа» даёт сдвигу 1250011604
ошибку 6-11 м (единственный сосед с ВТД 2023 — на другом конце нитки), которой в прогнозе 22871 нет.
Поэтому кандидаты сравниваются в трёх режимах:
  nb     — по умолчанию (сдвиг прошлого пропуска от соседа);
  oracle — PIPETWIN_ALIGN_ORACLE=1, сдвиг измерен по самой паре (как у 22871: оба конца измерены);
  self22 — PIPETWIN_VAL1=self22, сама 22871, 2018 -> 2022, 525 сегментов (в обучении нет её
           таргета 2022, модель не может запомнить её чистые места).
Метрики: r², MAE, RMSE, MAPE, Спирмен, доля попаданий в 10% / 20% самых тонких сегментов.

Результаты (2026-11-14, r²; ветка с ансамблем lab21 и сдвигом по совпавшим дефектам):
                      nb      oracle   self22    MAE oracle / self22
  ens_blend           0.693   0.599    0.011     0.267 / 0.505
  ens_blend+stats     0.546   0.690    0.060     0.242 / 0.460
  aligned_stats       0.273   0.701    0.215     0.375 / 0.839
  aligned_stats_cal   0.273   0.701    0.215     0.240 / 0.432
aligned_stats_cal (форма aligned_stats в уровне ens_blend) лучший в oracle и self22 по всем метрикам
(self22: Спирмен 0.475 против 0.015, топ-10% 0.47 против 0.06). ML-ансамбль на целевой трубе
проваливается: его r² на соседях держится на запоминании чистых мест той же трубы.
Бленд aligned_stats с весом w: w=0.25/0.5/2 — между крайними, без выигрыша по всем режимам.
Принято: PIPETWIN_CASE1=aligned_stats_cal.

Запуск (каждый режим — отдельный процесс, режим читается при импорте):
  python experiments/lab23_case1_candidates.py
  PIPETWIN_ALIGN_ORACLE=1 python experiments/lab23_case1_candidates.py
  PIPETWIN_VAL1=self22 python experiments/lab23_case1_candidates.py
Скрипт пересобирает data/processed/*.csv под режим — после него запустите run_all.py.
"""
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
warnings.filterwarnings("ignore")

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import train as T  # noqa: E402

F.build_all(extended=True)
ds = T.survival_labels(pd.read_csv(C.PROCESSED_DIR / "train_dataset.csv", parse_dates=["start", "end"]))
cfg = T.CASES["case1"]
feats = F.case_features(ds, "case1")
sub = ds[ds["kind"].isin(cfg["train_kinds"])]
tr, va = sub[sub["split"] == "train"], ds[ds["split"] == "val_case1"]
params = {f: dict(cfg.get("params", {}).get(f, {})) for f in T.MODEL_FAMILIES}
bag = T.fit_bag(tr[feats], tr["y"], tr["aft_lb"].values, tr["aft_ub"].values, params, cfg["aft"],
                families=cfg["families"])
ens = T.predict_bag(bag, va[feats], va["wt_nom"].values)["ensemble"]
p = T.fit_clf(tr[feats], tr["had_defect"]).predict_proba(va[feats])[:, 1]
q05 = np.mean([m.predict(va[feats]) for m in T.fit_q05_pair(tr[feats], tr["y"], cfg.get("params"))], axis=0)
ens_blend = T.blend_prob(ens, p, cfg["blend_w"], gap=ens - q05, gap_w=cfg.get("gap_w", 0.0))
stats = T.aligned_stats_score(va)


def blend_w(w):
    b = T.zscore(ens_blend) + w * T.zscore(stats)
    return T.zscore(b) * float(np.std(ens_blend)) + float(np.mean(ens_blend))


preds = {"ens_blend": ens_blend, "ens_blend+stats": T.blend_stats(ens_blend, stats),
         "aligned_stats": stats, "aligned_stats_cal": T.stats_at_level(ens_blend, stats),
         **{f"blend w={w}": blend_w(w) for w in (0.25, 0.5, 2.0)}}
y = va["y"].to_numpy()


def topk(share, q):
    k = max(1, int(np.ceil(len(y) * share)))
    return len(set(np.argsort(y)[:k]) & set(np.argsort(q)[:k])) / k


rows = [dict(model=n, r2=T.pearson_r2(y, q), mae=np.mean(np.abs(y - q)), rmse=np.sqrt(np.mean((y - q) ** 2)),
             mape=np.mean(np.abs(y - q) / y) * 100, spearman=spearmanr(y, q)[0],
             top10=topk(0.10, q), top20=topk(0.20, q)) for n, q in preds.items()]
print(f"val_case1: {len(va)} сегментов, трубы {sorted(va['id'].unique())}")
print(pd.DataFrame(rows).round(3).to_string(index=False))
