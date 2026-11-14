"""Лаборатория 70: устойчивость quant_cal / aligned_stats_cal к ошибке сдвига прошлого пропуска.

Сдвиг прошлого пропуска (2022) валидационных труб кейса 1 — измеренный по самой паре (как
case1_measured, геометрия 22871), к нему добавляется ошибка δ0 (истинная ошибка, неизвестная
прогнозу). Предикторы:
  plain     — статистика на сдвиге f + δ0;
  marg σ    — маргинализация по сдвигу: Σ_δ w(δ)·stat(f + δ0 + δ), w ~ N(0, σ), δ ∈ [−1.5, 1.5] шаг 0.5
              (прогноз не знает δ0 и усредняет по своей неопределённости);
  scale×1.2 — масштаб quant_cal (гипотеза 3).
Уровень/разброс «_cal» — от ens_blend валидации (база на честном оракульном датасете logs/ds64/or,
детерминирована). Метрики по реальному минимуму: r², r2d, MAE, RMSE, MAPE.
Запуск: python experiments/lab70_shift_marg.py [logs/ds64/or]

ИТОГ (оракул, честный датасет; средние по δ0 ∈ {0, ±0.5, ±1} / по всем 7 значениям δ0):
quant plain: r² 0.705 / 0.681, r2d 0.413 / 0.380, MAE 0.236 / 0.243, RMSE 0.328 / 0.336.
  δ0=0 — острый пик (0.731 против 0.684/0.709 при ±0.5): точное значение оракула — удача точки.
1. Маргинализация по сдвигу (σ 0.5): r² 0.707 / 0.690, r2d 0.416 / 0.391 — при |δ0|≤1 +0.002
   (в шуме), на ±2 м +0.02..0.04; при δ0=0 −0.015. Ожидание при ошибке ~N(0, 1 м): +0.004 r².
   НЕ встроено (прирост < 0.01; нужна пересборка признаков 22871 на сетке сдвигов) — страховка
   на случай ошибки сдвига ≥ 2 м; у aligned_stats то же (+0.001 / +0.007).
2. → lab71 (оценка сдвига внутри трубы).
3. Масштаб quant_cal: ×1.2 — MAE 0.236 -> 0.222 (|δ0|≤1), 7/7 δ0; σprev = std(prev_min) трубы —
   MAE 0.236 -> 0.217, RMSE 0.328 -> 0.302, 7/7 δ0, r² без изменений. ПРИНЯТО σprev (правило без
   подбора: разброс прошлого пропуска этой же трубы; на 22871 это ×1.19 к std(ens) — то же, что
   ×1.2). Цена: при сдвиге «от соседа» (r 0.46) MAE 0.358 -> 0.386 — геометрия не 22871.
   run_all сид 42: case1_measured quant_cal_phys MAE 0.230 -> 0.206, RMSE 0.319 -> 0.288,
   MAPE 3.95 -> 3.65; case1 (сосед) 0.358 -> 0.386.
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from pipetwin import align as A  # noqa: E402
from pipetwin import config as C  # noqa: E402
from pipetwin import features as F  # noqa: E402
from pipetwin import prepare  # noqa: E402
from pipetwin import train as T  # noqa: E402

GRID = np.round(np.arange(-3.5, 3.51, 0.5), 2)  # сдвиги, на которых считаются статистики
MARG = np.round(np.arange(-1.5, 1.51, 0.5), 2)
ERRS = (0.0, -0.5, 0.5, -1.0, 1.0, -2.0, 2.0)
YEAR = pd.Timedelta(days=365.25)


def stats_on_grid(vtd, runs, nseg, passport, va):
    """{δ: DataFrame(id, segment_id, prev_*)} для валидационных труб при сдвиге f_measured + δ."""
    start = pd.Timestamp(C.VAL_CASE1_START)
    pas = passport.set_index("id")
    out = {}
    for d in GRID:
        parts = []
        for pid in va["id"].unique():
            f0 = A.to_profile(vtd, passport, pid, start, None, method=A.CASE1_SHIFT_METHOD)
            f = (lambda x, f0=f0, d=d: f0(x) + d)
            sv = A.shifted_vtd(vtd, pid, start, f, int(nseg.loc[pid]))
            age = (start - pas.loc[pid, "date_in"]) / YEAR
            parts.append(F.start_state_features(sv, runs, nseg, passport, pid, start,
                                                "vtd2vtd", age))
        out[d] = pd.concat(parts, ignore_index=True)
    return out


def score(df, kind):
    return T.quant_score(df) if kind == "quant" else T.aligned_stats_score(df)


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "logs/ds64/or")
    ds = pd.read_csv(root / "train_dataset.csv", parse_dates=["start", "end"])
    ds = T.survival_labels(ds[ds["split"] != "train_honest"])
    cfg = T.CASES["case1"]
    feats = F.case_features(ds, "case1")
    sub = ds[ds["kind"].isin(cfg["train_kinds"])]
    tr, va = sub[sub["split"] == "train"], ds[ds["split"] == cfg["val_split"]].copy()
    bag = T.fit_bag(tr[feats], tr["y"], tr["aft_lb"].values, tr["aft_ub"].values,
                    cfg["params"], cfg["aft"], families=cfg["families"])
    ens = T.predict_bag(bag, va[feats], va["wt_nom"].values,
                        agg=cfg.get("member_agg", "mean"))["ensemble"]
    mu, sd = float(np.mean(ens)), float(np.std(ens))  # = уровень/разброс ens_blend

    passport = prepare.load_passport()
    nseg = prepare.n_segments(prepare.load_altitudes())
    vtd = prepare.load_vtd()
    runs = prepare.build_runs(vtd)
    grid = stats_on_grid(vtd, runs, nseg, passport, va)
    key = va[["id", "segment_id"]].reset_index(drop=True)
    grid = {d: key.merge(g, on=["id", "segment_id"], how="left") for d, g in grid.items()}
    # проверка: при δ=0 статистики совпадают с датасетом (оракульное выравнивание)
    chk = np.abs(grid[0.0]["prev_q10"].values - va["prev_q10"].values).max()
    print("контроль δ=0: max|Δprev_q10| =", round(float(chk), 4), flush=True)

    y, hd, wt = va["y"].values, va["had_defect"].values.astype(bool), va["wt_nom"].values
    rows = []
    for kind in ("quant", "aligned_stats"):
        S = {d: score(g, kind) for d, g in grid.items()}
        Z = {d: T.zscore(s) for d, s in S.items()}
        for e in ERRS:
            V = {"plain": Z[e]}
            for sg in (0.5, 1.0):
                w = np.exp(-0.5 * (MARG / sg) ** 2)
                w /= w.sum()
                V[f"marg σ{sg}"] = T.zscore(sum(wi * S[round(e + m, 2)] for wi, m in zip(w, MARG)))
            V["marg равн"] = T.zscore(sum(S[round(e + m, 2)] for m in MARG) / len(MARG))
            spm = float(np.std(grid[e]["prev_min"].values))  # разброс прошлого пропуска
            for name, z in V.items():
                for sc in (1.0, 1.2, "prev"):
                    scale = spm if sc == "prev" else sd * sc
                    p = np.clip(z * scale + mu, 0.5, wt)
                    tag = "" if sc == 1.0 else (" σprev" if sc == "prev" else f" ×{sc}")
                    rows.append(dict(kind=kind, err=e, variant=name + tag,
                                     r2=T.pearson_r2(y, p), r2d=T.pearson_r2(y[hd], p[hd]),
                                     mae=float(np.mean(np.abs(y - p))),
                                     rmse=float(np.sqrt(np.mean((y - p) ** 2))),
                                     mape=float(np.mean(np.abs(y - p) / y) * 100)))
    df = pd.DataFrame(rows)
    for k in ("r2", "r2d", "mae", "rmse"):
        piv = df.pivot_table(index=["kind", "variant"], columns="err", values=k).round(4)
        piv["|δ|≤1"] = piv[[c for c in piv.columns if abs(c) <= 1]].mean(axis=1).round(4)
        piv["все"] = piv[[c for c in piv.columns if c != "|δ|≤1"]].mean(axis=1).round(4)
        print(f"\n== {k}\n{piv.to_string()}", flush=True)


if __name__ == "__main__":
    main()
