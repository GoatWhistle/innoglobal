"""chart_data.json: валидационные прогнозы итоговых предикторов против факта (графики фронтенда)."""
import json

import pandas as pd

from . import config as C
from .train import PREDICTOR_NAME, pearson_r2


def run() -> None:
    val = pd.read_csv(C.ARTIFACTS_DIR / "val_predictions.csv")
    series = {}
    for case, name in PREDICTOR_NAME.items():
        v = val[val["case"] == case]
        series[case] = dict(model=name, fact=v["y"].round(3).tolist(),
                            pred=v[name].round(3).tolist(),
                            r2=round(pearson_r2(v["y"].to_numpy(), v[name].to_numpy()), 4))
    C.CHART_DATA.write_text(json.dumps({"val": series}, ensure_ascii=False))
