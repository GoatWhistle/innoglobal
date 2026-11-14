"""Лаборатория 62 (служебная): честный датасет кейса 1 без утечки выравнивания (по lab54
ветки exp/newmodels): у валидационных труб 1250009490/1250011604 все пропуски, кроме
самого целевого 2023, выравниваются в профиль без пропуска 2023 (exclude).
Выход: LAB_PROC (по умолчанию logs/proc_honest). Метрики калибровки/денойза
перемеряются на нём: LAB_PROC=logs/proc_honest LAB40_CACHE=... python experiments/lab40_cache.py и т.д.
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
_orig = A.to_profile


def to_profile_honest(vtd, passport, pipe_id, run, exclude=None):
    if pipe_id in VAL_PIPES and pd.Timestamp(run) != END and exclude is None:
        exclude = END
    return _orig(vtd, passport, pipe_id, run, exclude)


if __name__ == "__main__":
    A.to_profile = to_profile_honest
    A._cache.clear()
    C.PROCESSED_DIR = ROOT / os.environ.get("LAB_PROC", "logs/proc_honest")
    F.build_all(extended=True)
    print("built", C.PROCESSED_DIR)
