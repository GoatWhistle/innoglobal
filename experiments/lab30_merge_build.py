"""Лаборатория, серия 30 (сборка): датасеты-варианты для замеров мержа ветки
ml-pipetwin-merge-case-2 на базе lab20-21.

Переменные окружения читаются при импорте align/features, поэтому каждый вариант —
отдельный процесс: python experiments/lab30_merge_build.py <out_dir>
(env задаёт вариант: PIPETWIN_SHIFT_CASE1, PIPETWIN_SHIFT, PIPETWIN_ALIGN_ORACLE, PIPETWIN_UZT).
LAB_JITTER=<м> — к сдвигу прошлого пропуска (2022) валидационных труб кейса 1 добавляется
постоянная ошибка (с оракулом — модель «сдвиг известен с точностью δ», как у 22871, где сдвиг
интерполируется между измеренными концами; отклонение окон от линии до ~1.2 м).
LAB_MATCH_OLD=1 — прежний match-сдвиг (окна 250 м + одна прямая), для сравнения с 60 м-окнами
и кусочно-линейной интерполяцией (коммит 0a296d9 ветки коллеги).
LAB_HONEST=1 — честное выравнивание (утечка из exp/newmodels lab54): у валидационных труб кейса 1
все пропуски, кроме целевого 2023, выравниваются без 2023 (exclude), иначе train-строки «… -> 2022»
получают координаты через скрытый пропуск. Сдвиг прошлого пропуска валидационной пары не трогается
(по умолчанию он и так без 2023; в оракуле — намеренно по 2023).
Пишет train_dataset.csv / predict_dataset.csv в out_dir, data/processed не трогает.
"""
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features  # noqa: E402

if os.environ.get("LAB_MATCH_OLD") == "1":
    features.align.MATCH_WIN = 250.0
    features.align._shift_fn = lambda x, y, method: features.align._fit(x, y)

if os.environ.get("LAB_HONEST") == "1":
    import pandas as _pd

    _tp0 = features.align.to_profile
    _END = _pd.Timestamp(C.VAL_CASE1_END)
    _START = _pd.Timestamp(C.VAL_CASE1_START)

    def _honest(vtd, passport, pipe_id, run, exclude=None, method=None):
        val = set(vtd.loc[vtd["run_date"] == _END, "id"].unique()) - {C.CASE1_ID}
        run = _pd.Timestamp(run)
        is_val_start = method is not None and run == _START  # стартовый пропуск валидационной пары
        if pipe_id in val and run != _END and exclude is None and not is_val_start:
            exclude = _END
        return _tp0(vtd, passport, pipe_id, run, exclude, method=method)

    features.align.to_profile = _honest

JITTER = float(os.environ.get("LAB_JITTER", "0"))
if JITTER:
    import pandas as pd

    _tp = features.align.to_profile

    def to_profile(vtd, passport, pipe_id, run, exclude=None, method=None, **kw):
        f = _tp(vtd, passport, pipe_id, run, exclude, method=method, **kw)
        val = vtd.loc[vtd["run_date"] == pd.Timestamp(C.VAL_CASE1_END), "id"].unique()
        # прошлый пропуск валидационной пары (вызов с method= — только для стартового пропуска)
        if (method is not None and pipe_id in val and pipe_id != C.CASE1_ID
                and pd.Timestamp(run) == pd.Timestamp(C.VAL_CASE1_START)):
            return lambda d: f(d) + JITTER
        return f

    features.align.to_profile = to_profile


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    C.PROCESSED_DIR = out
    t0 = time.time()
    tr, pr = features.build_all(extended=True)
    print(f"{out.name}: train {len(tr)}, predict {len(pr)}, {time.time() - t0:.0f} c", flush=True)


if __name__ == "__main__":
    main()
