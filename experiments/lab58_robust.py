"""Лаборатория, серия 58: проверка устойчивости кандидатов lab55-57.

Валидация кейса 1 — 55 сегментов: добавление любой группы колонок двигает r² на ±0.05
(lab55 «win» −0.11). Поэтому для кандидатов:
  null   — те же колонки, перемешанные внутри пары (5 перестановок): распределение r²
           от «добавили шумные колонки той же формы»;
  self22 — вторая репетиция кейса 1 на самой целевой трубе 22871 (2018 -> 2022, 525
           сегментов, сдвиг одометра по соседям; PIPETWIN_VAL1=self22).
Запуск: r.sh experiments/lab58_robust.py lab58_null  (аргумент через env LAB58_MODE).
ИТОГ:
  null c1 (5 перестановок, сид 42): q mean 0.605 max 0.620 (реальный 0.635 — выше всех);
  bot 0.600/0.615; q+bot 0.607/0.628; climb 0.560/0.581; relief_all 0.367 (перемешанный рельеф
  ломает базу — нуль несравним).
  self22 (525 сегм., ref 0.018 — сигнала почти нет): q 0.021, bot 0.013, q+bot 0.018,
  relief_all 0.003, climb 0.010, q+relief 0.004.
  confirm8: ref8 mean 0.6182 r2d 0.228; quant8 0.6350 (8/8 сидов) r2d 0.263, MAE 0.264.
  q+bot 0.616, q+relief 0.629 — хуже quant.
  c2: angle 0.2018 (=angle1, rl_crit_up не используется), crit 0.188; strict: ref 0.0098,
  angle 0.0009, crit 0.0098 — отказ.
"""
import os
import sys
from pathlib import Path

if os.environ.get("LAB58_MODE") == "self22":
    os.environ["PIPETWIN_VAL1"] = "self22"
if os.environ.get("LAB58_MODE") == "c2strict":
    os.environ["PIPETWIN_VAL2_STRICT"] = "1"

import numpy as np  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))
import featlab as L  # noqa: E402
import lab55_defect_stats as A  # noqa: E402
import lab57_relief as B  # noqa: E402

CAND1 = {
    "q": A.GROUPS["quant"],
    "bot": A.GROUPS["bottom"],
    "q+bot": A.GROUPS["quant"] + A.GROUPS["bottom"],
    "relief_all": sum(B.GROUPS.values(), []),
    "climb": B.GROUPS["climb"],
    "q+relief": A.GROUPS["quant"] + sum(B.GROUPS.values(), []),
}
CAND2 = {"angle": B.GROUPS["angle"], "angle1": ["rl_angle"], "crit": ["rl_crit_up"]}


def load():
    ds = L.build(extra_state=A.seg_stats, extra_geom=B.relief, tag="lab58")
    for c in A.COLS_NAN:
        ds[c] = ds[c].fillna(0.0)
    ds["rl_angle_x_lam"] = ds["rl_angle"] * ds["rg_share_laminar"]
    ds["rl_angle_x_slow"] = ds["rl_angle"] * ds["rg_share_slow"]
    return ds


def main():
    mode = os.environ.get("LAB58_MODE", "null")
    ds = load()
    f1, f2 = L.base_feats(ds, "case1"), L.base_feats(ds, "case2")
    if mode == "confirm8":
        L.log("ref8", L.fmt(L.eval_case1(ds, f1, seeds=L.SEEDS8)))
        L.log("quant8", L.fmt(L.eval_case1(ds, f1 + A.GROUPS["quant"], seeds=L.SEEDS8)))
        for name in ("q+bot", "q+relief"):
            L.log(name, L.fmt(L.eval_case1(ds, f1 + CAND1[name])))
        return
    if mode in ("c2", "c2strict"):
        L.log(mode, "ref", L.eval_case2(ds, f2))
        for name, extra in CAND2.items():
            L.log(mode, name, L.eval_case2(ds, f2 + extra))
        return
    if mode == "self22":
        L.log("self22 ref", L.fmt(L.eval_case1(ds, f1)))
        for name, extra in CAND1.items():
            L.log("self22", name, L.fmt(L.eval_case1(ds, f1 + extra)))
        return
    for name, extra in CAND1.items():
        res = L.null_case1(ds, f1, extra)
        nul, nd = [r[0] for r in res], [r[2] for r in res]
        L.log("null c1", name, " ".join(f"{x:.4f}" for x in nul),
              f"| mean {np.mean(nul):.4f} max {np.max(nul):.4f}",
              f"| r2d mean {np.mean(nd):.4f} max {np.max(nd):.4f}")
    for name, extra in CAND2.items():
        nul = [L.eval_case2(L.permuted(ds, extra, p), f2 + extra)[0] for p in range(5)]
        L.log("null c2", name, " ".join(f"{x:.4f}" for x in nul),
              f"| mean {np.mean(nul):.4f} max {np.max(nul):.4f}")


if __name__ == "__main__":
    main()
