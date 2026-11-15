"""Полный конвейер: исходные CSV -> хранилище -> result.csv. Запуск: python run_all.py [--tune N]."""
import argparse
import random
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import explain, features, predict, train, warehouse  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tune", type=int, default=0, metavar="N",
                        help="число трайлов Optuna на каждую модель (0 = параметры по умолчанию)")
    args = parser.parse_args()

    random.seed(C.SEED)
    np.random.seed(C.SEED)

    print("[0/4] Хранилище: CSV -> raw -> core (DuckDB) + проверки качества...")
    warehouse.build(force=True)

    print("[1/4] Подготовка данных и признаков...")
    train_ds, pred_ds = features.build_all(extended=True)
    print(f"      train: {len(train_ds)} сегментов, predict: {len(pred_ds)} сегментов")

    print(f"[2/4] Обучение (optuna trials = {args.tune})...")
    report = train.run(tune_trials=args.tune)
    print(report.to_string(index=False))

    print("[3/4] Прогноз и result.csv...")
    result = predict.run()
    print(f"      result.csv: {len(result)} строк, трубы: {sorted(result['id'].unique())}")

    print("[4/4] Интерпретация: декомпозиция прогноза, правило ранжирования, карточки сегментов...")
    explain.run()


if __name__ == "__main__":
    main()
