"""Лаборатория, серия 58b: перемер кандидатов lab55-59 на честной валидации кейса 1
(PIPETWIN_HONEST=1: выравнивание train-строк валидационных труб без скрытого пропуска 2023).
ИТОГ: см. конец файла.
"""
import os
import sys
from pathlib import Path

os.environ["PIPETWIN_HONEST"] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parent))
import featlab as L  # noqa: E402
import lab55_defect_stats as A  # noqa: E402
import lab55b_robust_depth as RB  # noqa: E402
import lab57_relief as B  # noqa: E402
import lab59_te_select as TS  # noqa: E402

QS = ["prev_q10", "prev_q25", "prev_qmed", "prev_mean_depth"]


def stats_and_robust(sub, n, wt, ctx):
    a = A.seg_stats(sub, n, wt, ctx)
    return a.merge(RB.robust(sub, n, wt, ctx), on="segment_id")


def main():
    ds = L.build(extra_state=stats_and_robust, extra_geom=B.relief, tag="lab58b")
    for c in A.COLS_NAN:
        ds[c] = ds[c].fillna(0.0)
    ds = TS.add_lags(ds)
    ds["rl_angle_x_lam"] = ds["rl_angle"] * ds["rg_share_laminar"]
    ds["rl_angle_x_slow"] = ds["rl_angle"] * ds["rg_share_slow"]
    skip = set(os.environ.get("SKIP", "").split(","))
    f1 = [c for c in L.base_feats(ds, "case1") if c not in QS]  # база без quant
    lags = [f"lag_{a}_{b}{k}" for a in ("min", "def") for b in ("m", "p") for k in (1, 2)]
    if "ref" not in skip:
        L.log("H ref", L.fmt(L.eval_case1(ds, f1, seeds=L.SEEDS8)))
        L.log("H quant", L.fmt(L.eval_case1(ds, f1 + QS, seeds=L.SEEDS8)))
        res = L.null_case1(ds, f1, QS)
        L.log("H quant null", " ".join(f"{r[0]:.4f}/{r[2]:.4f}" for r in res))
    cand = {g: A.GROUPS[g] for g in ("bottom", "morph", "rank", "win", "nbdiff")}
    cand.update({"relief": sum(B.GROUPS.values(), []), "climb": B.GROUPS["climb"], "lags": lags,
                 "top3": RB.GROUPS["top3"], "ndeep": RB.GROUPS["ndeep"],
                 "margin": RB.GROUPS["margin"]})
    for name, extra in cand.items():
        if name in skip:
            continue
        L.log("H", name, L.fmt(L.eval_case1(ds, f1 + extra)))
        L.log("H q+", name, L.fmt(L.eval_case1(ds, f1 + QS + extra)))


if __name__ == "__main__":
    main()
