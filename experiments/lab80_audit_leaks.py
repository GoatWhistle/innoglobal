"""Лаборатория, серия 80 (аудит exp/integrate): утечки в путях валидации кейса 1.

Варианты датасета (каждый — отдельный процесс, env читается при импорте align/features):
  base     — как в exp/integrate (сосед + блок case1_measured, honest-строки);
  oracle0  — PIPETWIN_ALIGN_ORACLE=1 на коде ДО фикса: honest_val_rows при ORACLE отключён,
             train-строки труб валидации («… -> 2022») выровнены через скрытый пропуск 2023;
  oracle1  — PIPETWIN_ALIGN_ORACLE=1 с фиксом (honest-строки и в оракуле);
  geo      — строгая геометрия: при сборке ВСЕХ невалидационных пар пропуски 2023 труб
             валидации (9490, 11604) не участвуют в выравнивании (ни в цепочках to_profile, ни как
             опорные пропуски line_shift соседей) — проверка, переносит ли геометрия 2023
             (позиции дефектов скрытого пропуска) информацию в обучение. Валидационные пары — как в base.
Оценка — train.run на датасете (отчёт в logs/lab80/<var>/validation_report.csv).
Запуск: python experiments/lab80_audit_leaks.py <var> build|eval

Результат (case1 r² / MAE; сосед | measured):
  base     ens_blend 0.297 | 0.290, dens_quant_cal 0.2886/0.337 | 0.7475/0.227
  oracle0  ens_blend 0.5505 (УТЕЧКА: train-строки труб валидации через 2023), dens_quant_cal 0.7475
  oracle1  (с фиксом) ens_blend 0.2898, dens_quant_cal 0.7475/0.227 — ровно блок measured базы
  geo2     ens_blend 0.300 | 0.206; dens_quant_cal MAE 0.358 | 0.257 (r² тот же — предиктор без обучения)
  geo      ens_blend 0.305 | 0.309; dens_quant_cal MAE 0.352 | 0.263 (портит и законное выравнивание 22871)
Фикс: features.honest_val_rows работает и при ORACLE. Геометрия 2023 другой валидационной трубы
(geo2) — MAE кейса 1 на 0.02-0.03 мм оптимистичен, r² прод-предиктора не задет; не фиксилось.
"""
import os
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from pipetwin import align as A  # noqa: E402
from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402

VAL_PIPES = {1250009490, 1250011604}
END = pd.Timestamp(C.VAL_CASE1_END)


def patch_old_oracle():
    orig = F.honest_val_rows

    def old(pairs, train, ctx):
        if A.ORACLE:
            return train.iloc[0:0]
        return orig(pairs, train, ctx)
    F.honest_val_rows = old


NARROW = False


def patch_geo():
    """Невалидационные пары собираются без пропусков 2023 труб валидации."""
    orig_build, orig_hh, orig_tp = F.build_rows, A.has_heights, A.to_profile
    state = {"strict": False}

    def hh():
        h = orig_hh()
        return {x for x in h if not (x[0] in VAL_PIPES and pd.Timestamp(x[1]) == END)} \
            if state["strict"] else h

    def tp(vtd, passport, pipe_id, run, exclude=None, method=None):
        if state["strict"] and pipe_id in VAL_PIPES and exclude is None:
            exclude = END
        return orig_tp(vtd, passport, pipe_id, run, exclude, method=method)

    def build_rows(pairs, with_target, **kw):
        if not with_target or kw.get("measured"):
            return orig_build(pairs, with_target, **kw)
        isval = pairs.apply(lambda p: A.is_case1_val(p["id"], p["start"], p["end"]), axis=1)
        parts = []
        pairs = pairs.reset_index(drop=True)
        for i in range(len(pairs)):
            state["strict"] = not bool(isval.iloc[i]) and (
                not NARROW or int(pairs["id"].iloc[i]) in VAL_PIPES)
            A._cache.pop("h", None)
            for k in [k for k in A._cache if k != "raw"]:
                A._cache.pop(k)
            parts.append(orig_build(pairs.iloc[[i]], with_target, **kw))
        state["strict"] = False
        A._cache.clear()
        return pd.concat(parts, ignore_index=True)

    A.has_heights, A.to_profile, F.build_rows = hh, tp, build_rows


def main():
    var, stage = sys.argv[1], sys.argv[2]
    out = ROOT / "logs" / "lab80" / var
    C.PROCESSED_DIR = out / "processed"
    C.ARTIFACTS_DIR = out / "artifacts"
    if stage == "build":
        if var == "oracle0":
            patch_old_oracle()
        if var in ("geo", "geo2"):
            global NARROW
            NARROW = var == "geo2"
            patch_geo()
        tr, pr = F.build_all(extended=True)
        print(var, len(tr), tr["split"].value_counts().to_dict(), flush=True)
    else:
        from pipetwin import train as T
        rep = T.run()
        rep.to_csv(out / "validation_report.csv", index=False)
        print(rep[rep["case"].str.startswith("case1")].to_string(index=False), flush=True)


if __name__ == "__main__":
    main()
