"""Пути, seed, целевые трубы и валидационные пары."""
import os
from pathlib import Path

SEED = 42
SEG_LEN = 10.0  # метров в сегменте

# ROOT — куда пишутся результаты (их читает backend), по умолчанию корень репозитория.
# INPUT_DIR — исходные CSV, по умолчанию ROOT/data.
ROOT = Path(os.environ.get("PIPETWIN_ROOT") or Path(__file__).resolve().parents[3])
INPUT_DIR = Path(os.environ.get("PIPETWIN_INPUT") or ROOT / "data")
DATA_DIR = ROOT / "data"
PROCESSED_DIR = DATA_DIR / "processed"
ARTIFACTS_DIR = ROOT / "artifacts"
WAREHOUSE_DB = ROOT / "warehouse" / "pipetwin.duckdb"
WAREHOUSE_CODE = Path(__file__).resolve().parents[2] / "warehouse"
RESULT_CSV = ROOT / "result.csv"
CHART_DATA = ROOT / "chart_data.json"

# Кейс 1: прогноз между ВТД. У трубы 22871 скрыт пропуск 01.12.2023, у соседей по нитке он есть.
CASE1_ID = 1250022871
CASE1_PREV_RUN = "2022-07-06"
CASE1_T = "2023-12-01"

# Кейс 2: прогноз от ввода. У трубы 9583 нет ни одного пропуска ВТД.
CASE2_ID = 1250009583
CASE2_T = "2022-07-01"

# Валидация:
#  - кейс 1: переход ВТД 2022 -> 01.12.2023 на соседях целевой трубы по нитке;
#  - кейс 2: «ввод 2000 -> первый ВТД 2018» на трубе 22871. Трубы ЦППН-2011 для этого не годятся:
#    дефектов почти нет, таргет вырождается в константу.
VAL_CASE1_START = CASE1_PREV_RUN
VAL_CASE1_END = "2023-12-01"
VAL_CASE2_PAIRS = ((1250022871, "2018-09-23"),)
