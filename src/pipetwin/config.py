"""Общая конфигурация: пути, seed, целевые трубы."""
from pathlib import Path

SEED = 42
SEG_LEN = 10.0  # метров в сегменте

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
PROCESSED_DIR = DATA_DIR / "processed"
ARTIFACTS_DIR = ROOT / "artifacts"
WAREHOUSE_DB = ROOT / "warehouse" / "pipetwin.duckdb"  # модель читает слой core отсюда

# исходные CSV: вход хранилища (warehouse/build.py) и сырой EDA в experiments/
F_PASSPORT = DATA_DIR / "pot_south.csv"
F_ALTITUDES = DATA_DIR / "altitudes_south.csv"
F_VTD = DATA_DIR / "vtd_south_train.csv"
F_UZT = DATA_DIR / "uzt_south.csv"
F_REGIME = DATA_DIR / "tech_mode_for_embedings_with_length_with_temperatures_ids16.csv"
F_REPCORR = DATA_DIR / "repcorr_south.csv"

# Кейс 1: несколько ВТД, скрыт пропуск 01.12.2023 (у соседей по нитке он дан).
CASE1_ID = 1250022871
CASE1_PREV_RUN = "2022-07-06"
CASE1_T = "2023-12-01"

# Кейс 2: единственный (скрытый) ВТД; дата прогноза продиктована менторами
# (запись Q&A, notes/mentor-qa-transcript.txt, 11:04): 1 июля 2022.
CASE2_ID = 1250009583
CASE2_T = "2022-07-01"

# ВТД старой заменённой трубы (нитка Куст-2 - ДНС-1, пропуск 2014 при вводе 2016)
# исключается в хранилище общим правилом: core.ili_run.is_training_eligible.

# Валидационные пары (репетиция обоих кейсов):
#  - кейс 1: переход 2022 -> 01.12.2023 на соседях целевой трубы;
#  - кейс 2: "ввод-2000 -> первый ВТД-2018" на трубе 22871 — старая труба без
#    покрытия с богатой дефектностью; трубы ЦППН-2011 для этого не годятся:
#    у них почти нет дефектов, таргет вырождается в константу и Пирсон = 0.
VAL_CASE1_END = "2023-12-01"
VAL_CASE2_PAIRS = ((1250022871, "2018-09-23"),)
