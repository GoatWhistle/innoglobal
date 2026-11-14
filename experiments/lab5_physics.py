"""Лаборатория, серия 5: физико-химическая проверка факторов из file.pdf.

A. Единицы обводнённости по трубам (аномалия 9583).
B. Угловое распределение внутренних дефектов (донная коррозия = 6 часов).
C. Плотность/глубина дефектов vs рельеф (низины, восходящие участки).
D. Гравиметрия: скорость коррозии vs обводнённость, ингибитор, химия воды.
E. Скорости потока vs порог расслоения.
F. pit_corrosion_intensity (гидравлическая модель) vs фактические потери ВТД.
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import prepare  # noqa: E402

pd.set_option("display.width", 200)

passport = prepare.load_passport()
alt = prepare.load_altitudes()
nseg = prepare.n_segments(alt)
vtd = prepare.load_vtd()
regime = F.load_regime()

print("=== A. Обводнённость по трубам (ед. измерения?) ===")
wc = regime.groupby("id")["watercut"].agg(["mean", "max"]).round(2)
wc["n_days"] = regime.groupby("id").size()
print(wc.to_string())

print("\n=== B. Угловое распределение внутренних дефектов ===")
vang = pd.read_csv(C.F_VTD, usecols=["id", "Defect Type", "Angle", "Defect Depth in %"])
vint = vang[vang["Defect Type"].str.lower().str.startswith("вну", na=False)].dropna(
    subset=["Angle", "Defect Depth in %"])
bins = pd.cut(vint["Angle"], bins=[0, 60, 120, 180, 240, 300, 360], include_lowest=True)
ang = vint.groupby(bins, observed=True).agg(
    n=("Angle", "size"), depth_mean=("Defect Depth in %", "mean")).round(2)
print(ang.to_string())
print("(донная коррозия от стоячей воды -> пик дефектов около 120-240°)")

print("\n=== C. Рельеф vs дефекты (труба 22871, пропуск 2022) ===")
geom = F.geometry_features(alt, nseg)
g = geom[geom["id"] == 1250022871].set_index("segment_id")
run = vtd[(vtd["id"] == 1250022871) & (vtd["vtd_date_raw"] == "06.07.2022")].dropna(
    subset=["Residual Wall Thickness"])
seg = run.groupby("segment_id").agg(ndef=("Distance", "size"),
                                    minrwt=("Residual Wall Thickness", "min"),
                                    maxdepth=("Defect Depth in %", "max"))
j = g.join(seg).fillna({"ndef": 0})
j["loss"] = 8.0 - j["minrwt"]
for feat in ("lowness_250m", "lowness_1km", "slope", "z_rel", "water_trap"):
    sub = j.dropna(subset=["loss"])
    print(f"corr({feat}, потеря металла) = {sub[feat].corr(sub['loss']):+.3f} | "
          f"corr({feat}, плотность дефектов) = {j[feat].corr(j['ndef']):+.3f}")

print("\n=== D. Гравиметрия: химия и ингибитор ===")
rep = pd.read_csv(C.F_REPCORR)
rate = rep["Average Corrosion Rate by Gravimetry"]
print("скорость коррозии мм/год: ", rate.describe().round(3).to_dict())
for col in ("H2O", "pH", "Cl-", "HCO3-", "Total Mineralization", "CO2 in Water Phase"):
    v = pd.to_numeric(rep[col], errors="coerce")
    ok = v.notna() & rate.notna()
    if ok.sum() > 10:
        print(f"corr({col:>22}, rate) = {v[ok].corr(rate[ok]):+.3f} "
              f"(n={ok.sum()}, диапазон {v.min():.1f}-{v.max():.1f})")
pe = pd.to_numeric(rep["Protective Effect"], errors="coerce")
print("защитный эффект ингибитора, %:", pe.describe().round(1).to_dict())
print("по годам, медианная rate:", rep.groupby("Year")[rate.name].median().round(3).to_dict())

print("\n=== E. Скорость потока vs порог расслоения (0.3-0.5 м/с) ===")
vq = regime.groupby("id")["v_liquid_true"].agg(
    ["mean", lambda s: (s < 0.3).mean(), lambda s: (s < 0.5).mean()]).round(3)
vq.columns = ["v_mean", "share<0.3", "share<0.5"]
print(vq.to_string())

print("\n=== F. pit_corrosion_intensity vs факт потерь ===")
rows = []
for pid, d1, d2, wt in [(1250022871, None, "23.09.2018", 8.0),
                        (1250022871, "23.09.2018", "06.07.2022", 8.0),
                        (1250011604, "06.07.2022", "01.12.2023", 8.0),
                        (1250028934, None, "12.08.2023", 6.0)]:
    run = vtd[(vtd["id"] == pid) & (vtd["vtd_date_raw"] == d2)].dropna(
        subset=["Residual Wall Thickness"])
    loss = (wt - run.groupby("segment_id")["Residual Wall Thickness"].min()).mean()
    w = regime[regime["id"] == pid]
    pit = w["pit_corrosion_intensity"].mean()
    rows.append(dict(id=pid, run=d2, mean_loss_mm=round(loss, 2),
                     pit_mean=round(pit, 3)))
print(pd.DataFrame(rows).to_string(index=False))
