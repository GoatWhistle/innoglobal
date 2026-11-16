"""Полный конвейер: data/*.csv -> хранилище DuckDB -> признаки -> модели -> result.csv.

Запуск: python -m pipetwin [--skip-if-ready]
"""
import argparse
import random
import time

import numpy as np

from . import charts, explain, features, predict, train, warehouse
from . import config as C

OUTPUTS = (C.RESULT_CSV, C.CHART_DATA, C.WAREHOUSE_DB,
           C.PROCESSED_DIR / "train_dataset.csv", C.PROCESSED_DIR / "predict_dataset.csv",
           C.ARTIFACTS_DIR / "explain_cards.jsonl", C.ARTIFACTS_DIR / "uncertainty.csv")


def main() -> None:
    parser = argparse.ArgumentParser(prog="pipetwin", description=__doc__.splitlines()[0])
    parser.add_argument("--skip-if-ready", action="store_true",
                        help="ничего не делать, если все результаты уже на месте")
    args = parser.parse_args()
    if args.skip_if_ready and all(p.is_file() for p in OUTPUTS):
        print(f"Результаты уже есть в {C.ROOT}, пропускаю. Пересчитать: python -m pipetwin")
        return

    random.seed(C.SEED)
    np.random.seed(C.SEED)
    t0 = time.time()
    print("[1/5] Хранилище: CSV -> raw -> core (DuckDB) + проверки качества", flush=True)
    warehouse.build(force=True)
    print("[2/5] Признаки сегментов и выравнивание пропусков ВТД", flush=True)
    train_ds, pred_ds = features.build_all()
    print(f"      обучение: {len(train_ds)} строк, прогноз: {len(pred_ds)} сегментов", flush=True)
    print("[3/5] Обучение и валидация", flush=True)
    report = train.run()
    final = report[report["model"].isin(train.PREDICTOR_NAME.values())]
    print(final[["case", "model", "n", "pearson_r2", "mae"]].to_string(index=False), flush=True)
    print("[4/5] Прогноз целевых труб", flush=True)
    result = predict.run()
    print(f"      {C.RESULT_CSV}: {len(result)} строк", flush=True)
    print("[5/5] Интерпретация и данные для графиков", flush=True)
    explain.run()
    charts.run()
    print(f"Готово за {time.time() - t0:.0f} с", flush=True)


if __name__ == "__main__":
    main()
