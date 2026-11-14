"""Лаборатория, серия 39 (кейс 2): рельефный приор дефекта для товарной нефти.

9583 лежит на направлении ДНС-1→ЦППН-1 (нефть товарная). Бустинг-регрессия на её
сегментах почти константа (84% — полка): различает сегменты только абсолютная
отметка z (идентификатор трубы, lab36). Здесь — отдельный слабый, но
физичный источник формы: логистическая регрессия «в сегменте будет дефект» на
относительных признаках рельефа (c2feats.RELIEF + уклоны/подъёмы), обученная на
трубах того же режима (ЦППН). LOPO по ЦППН — AUC 0.66/0.64/0.50/0.65 (C=0.1);
перенос ЦППН -> 22871 AUC 0.58. Коэффициенты: z_rel +0.42, lowness_250m +0.40,
climb_rise +0.38, sag_31 −0.34 — дефекты на подъёмах и выше локального дна
(вода выпадает на затяжных подъёмах), а не в самых низких точках.
Бленд как в кейсе 1: z(ens) + w·z(−P) с возвратом к уровню/разбросу ens.

ИТОГ (r²; src=cppn — приор обучен на трубах ЦППН train; all — на всех парах):
  база ref (с z):  w=0 0.1813/0.0098/0.0075; cppn w=0.25 0.1937/0.0174/0.0094;
                   w=0.5 0.1873/0.0239/0.0070; w=1 0.1535/0.0307; all-приор хуже (V1 падает).
  база −z:         w=0 0.1902/0.0296/0.0000; cppn w=0.25 0.2021/0.0409/0.0094;
                   **w=0.5 0.1946/0.0480/0.0094** (принято); w=1 0.1585/0.0513.
  Устойчивость по C логрега (−z, w=0.5): C=0.03 0.1888/0.0463/0.0057,
                   C=0.1 0.1946/0.0480/0.0094, C=0.3 0.1963/0.0478/0.0084.
w=0.5 выбран как баланс V1/строгой V2 (оба > реф при любом C и w∈{0.25,0.5}).
Рост V2 (строгой) 0.010 -> 0.048 — первый вклад в кейс 2, не зависящий от «своей» трубы.
Детерминировано (LGBM без подвыборки + логрег): 3/8 сидов дают одно и то же.
Прогноз 9583: полка ушла (макс. доля одного значения 8% — клип верхнего 1% у номинала),
corr со старым −0.32 — ориентация сменилась: старый «выше отметка — толще» был артефактом
z-идентификатора, а по данным выше относительная отметка — тоньше на всех 4 трубах ЦППН
(Спирмен z~y −0.08…−0.11) и на 22871 (−0.14/−0.22).
"""
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parent))
import c2feats as CF  # noqa: E402
import c2lab as L  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from pipetwin import train as T  # noqa: E402

GEO = (["slope", "lowness_250m", "lowness_1km", "z_rel", "water_trap", "climb_len",
        "climb_rise", "climb_pos", "rise_500m"] + CF.RELIEF)
CPPN = (1250009584, 1250009587, 1250028931, 1250028932, 1250028933, 1250028934,
        1250028935)


def relief_p(tr, va, src="cppn", C=0.1):
    tr = CF.add_relief(tr)
    va = CF.add_relief(va)
    if src == "cppn":
        tr = tr[tr["id"].isin(CPPN)]
    m = make_pipeline(StandardScaler(), LogisticRegression(C=C, max_iter=2000))
    m.fit(tr[GEO].fillna(0), tr["had_defect"].astype(int))
    return m.predict_proba(va[GEO].fillna(0))[:, 1]


def main():
    import os
    ds, sub, feats = L.load()
    tag = os.environ.get("ENS", "ref")
    creg = float(os.environ.get("CREG", "0.1"))
    if tag == "noz":  # база без абсолютной отметки z (lab36 «-z»)
        feats = [f for f in feats if f != "z"]
    rows = []
    t = time.time()
    for name, pairs in L.splits(ds, sub).items():
        for tr, va in pairs:
            ens = L.ref_predict(tr, va, feats)
            y = va["y"].values
            for src in ("cppn", "all"):
                p = relief_p(tr, va, src, C=creg)
                for w in (0.0, 0.25, 0.5, 1.0, 2.0, "P"):
                    if w == "P":
                        pred = -p
                    elif w == 0.0:
                        pred = ens
                    else:
                        pred = T.blend_prob(ens, p, w) if np.std(ens) > 1e-9 else -p
                    rows.append(dict(split=name, pipe=int(va["id"].iloc[0]), src=src,
                                     w=str(w), r2=L.r2(y, pred), mae=L.mae(y, pred)))
            print(name, int(va["id"].iloc[0]), f"{time.time() - t:.0f}s", flush=True)
    df = pd.DataFrame(rows)
    print(df.pivot_table(index=["src", "w"], columns="split", values="r2").round(4).to_string())
    print(df[df.split == "V3"].pivot_table(index=["src", "w"], columns="pipe",
                                           values="r2").round(4).to_string())
    df.to_csv(Path(__file__).resolve().parents[1] / "logs" / f"lab39_{tag}_C{creg}.csv", index=False)


if __name__ == "__main__":
    main()
