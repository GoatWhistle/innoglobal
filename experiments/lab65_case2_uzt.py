"""Лаборатория, серия 65 (интеграция): кейс 2 exp/case2 (−z, рельефный приор w=0.5,
калибровка R3) против компенсации офсета УЗТ (exp/merge-c2: V1 0.1813 -> 0.1934).

Датасеты: experiments/lab30_merge_build.py с PIPETWIN_UZT=corr (дефолт) и raw.
Метрики — стенд experiments/c2lab.py: V1 official, V2 strict (22871 вне train), V3 ЦППН-LOPO.
Варианты: ref (LGBM-сетка с z, как до exp/case2), ens (без z), prior_cal (боевой exp/case2).
Всё детерминировано (LGBM без подвыборки, логрег) — один прогон.
Запуск: python experiments/lab65_case2_uzt.py <ds_root> --tags uzt_corr,uzt_raw
"""
import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import c2lab  # noqa: E402
from pipetwin import config as C  # noqa: E402
from pipetwin import prepare  # noqa: E402
from pipetwin import train as T  # noqa: E402

DIR_OF = dict(prepare.load_passport()[["id", "direction"]].itertuples(index=False))
CFG = T.CASES["case2"]


def ens(tr, va, feats):
    return c2lab.ref_predict(tr, va, feats)


def ref_z(tr, va, feats):
    return c2lab.ref_predict(tr, va, feats + ["z"])


def prior_cal(tr, va, feats):
    e = c2lab.ref_predict(tr, va, feats)
    return T._case2_shape(e, tr, va, CFG, DIR_OF)["ens_prior_cal"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root")
    ap.add_argument("--tags", required=True)
    a = ap.parse_args()
    rows = []
    for tag in a.tags.split(","):
        C.PROCESSED_DIR = Path(a.root) / tag
        ds, sub, feats = c2lab.load()
        for name, fn in (("ref_z", ref_z), ("ens_noz", ens), ("prior_cal", prior_cal)):
            print(tag, name, flush=True)
            r = c2lab.evaluate(fn, ds, sub, feats)
            raw, dep = c2lab.deploy_profile(fn, ds, sub, feats)
            v, c = np.unique(np.round(dep, 3), return_counts=True)
            rows.append(dict(tag=tag, var=name, **{k: v_ for k, v_ in r.items() if k != "V3_each"},
                             shelf=round(c.max() / len(dep), 3), dep_std=round(float(np.std(dep)), 3)))
    print(pd.DataFrame(rows).round(4).to_string(index=False))


if __name__ == "__main__":
    main()
