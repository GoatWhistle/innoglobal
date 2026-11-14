"""Серия 69 (интеграция): данные для report.html из артефактов текущего прогона run_all.py.

Берёт artifacts/val_predictions.csv (посегментные честные валидационные прогнозы train.run),
validation_report.csv, uncertainty.csv, важности, prev_min прошлого ВТД 22871 и вписывает
const DATA = {...} в report.html (остальная страница не трогается).
Кейс 1 на графике — блок case1_measured (сдвиг прошлого пропуска измерен по самой паре, как у
22871, где он измерен на обоих концах трубы), предиктор dens_quant_cal; кейс 2 — ens_prior_cal.
Запуск: python experiments/lab69_report_data.py
"""
import json
import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from pipetwin import config as C  # noqa: E402

PRED1, PRED2 = "dens_quant_cal_phys", "ens_prior_cal"


def km(seg):
    return [round((s + 0.5) * C.SEG_LEN / 1000, 3) for s in seg]


def main():
    A = C.ARTIFACTS_DIR
    vp = pd.read_csv(A / "val_predictions.csv")
    unc = pd.read_csv(A / "uncertainty.csv")
    rep = pd.read_csv(A / "validation_report.csv")
    pr = pd.read_csv(C.PROCESSED_DIR / "predict_dataset.csv")
    data = {}
    for pid, key in ((C.CASE1_ID, "final_case1"), (C.CASE2_ID, "final_case2")):
        u = unc[unc["id"] == pid].sort_values("segment_id")
        d = dict(pipe=str(pid), km=km(u["segment_id"]),
                 **{c: u[c].round(3).tolist() for c in ("thickness_pred", "p05", "p10", "p90", "p95")})
        d["pred"] = d.pop("thickness_pred")
        if pid == C.CASE1_ID:
            g = pr[pr["id"] == pid].set_index("segment_id")["prev_min"]
            d["vtd_prev"] = g.reindex(u["segment_id"]).round(3).tolist()
        data[key] = d
    for case, col, key in (("case1_measured", PRED1, "val_case1"), ("case2", PRED2, "val_case2")):
        v = vp[vp["case"] == case]
        series = [dict(pipe=str(pid), km=km(g["segment_id"]), vtd=g["y"].round(3).tolist(),
                       pred=g[col].round(3).tolist())
                  for pid, g in v.sort_values(["id", "segment_id"]).groupby("id")]
        r = rep[(rep["case"] == case) & (rep["model"] == col)]
        data[key] = dict(r2=float(r["pearson_r2"].iloc[0]), series=series)
    for case in ("case1", "case2"):
        fi = pd.read_csv(A / f"feature_importance_{case}.csv")
        data[f"imp_{case}"] = dict(feature=fi["feature"].tolist(),
                                   importance=fi["importance"].round(2).tolist())
    data["report"] = json.loads(rep.where(rep.notna(), None).to_json(orient="records"))
    html = (ROOT / "report.html").read_text()
    new, n = re.subn(r"const DATA = \{.*?\};\n", lambda m: "const DATA = " + json.dumps(
        data, ensure_ascii=False, separators=(",", ":")) + ";\n", html, count=1, flags=re.S)
    assert n == 1
    (ROOT / "report.html").write_text(new)
    print("OK", {k: data[k]["r2"] for k in ("val_case1", "val_case2")}, f"{len(new) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
