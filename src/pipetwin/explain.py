"""Интерпретация прогноза: точная декомпозиция числа, правило ранжирования, карточка сегмента.

Три вопроса (Q&A менторов №2):
1. Почему модель дала такое число? — слой 1, `decompose`. Финальные предикторы обоих кейсов —
   аффинные композиции z-слагаемых, поэтому вклад каждого слагаемого в мм точный, без SHAP:
   кейс 1 (dens_quant_cal): pred = уровень + k·[z(q02) + z(q10) + z(q10_nb3) − z(ndef_w5)],
                            уровень = mean(ens_blend), k = 1.2·std(ens_blend)/std(суммы);
                            ансамбль задаёт только уровень и масштаб трубы, форму — прошлый ВТД;
   кейс 2 (ens_prior_cal):  LGBM на 9583 — константа, форма = −логит рельефного приора
                            (StandardScaler + LogisticRegression, вклад признака = coef·x_std),
                            уровень = номинал − скорость аналогов × возраст, масштаб — якорь
                            «максимум = номинал».
   Затем сдвиг p99 (кейс 2) и клиппинг [0.5, номинал]. Сумма вкладов сверяется с result.csv.
2. Почему участок проверять раньше других? — слой 2, `ranking`: точное правило predict.py
   (топ-10% по p10, при равенстве — меньший segment_id), сверка с top_risk_segments.csv.
3. Что физически вызвало утонение? — слой 3, `cards`: наблюдение (факты данных), поведение модели
   (вклады слоя 1), инженерная гипотеза (правила, проверенные на данных) и явный список того,
   чего в данных нет. Карточка — JSON, вход для LLM-прозы (делается отдельно); `render_card` —
   детерминированный шаблон.

Запуск: python -m pipetwin.explain (после run_all.py). Выход: artifacts/explain_contrib.csv,
artifacts/explain_cards.jsonl, artifacts/explain_top.md.
"""
import json
import math

import joblib
import numpy as np
import pandas as pd

from . import align
from . import config as C
from . import features as F
from . import prepare
from . import warehouse as W
from .predict import PREDICTOR
from .train import (analog_rates, blend_prob, calibrate_level, case1_stat_predictors, predict_bag,
                    prior_blend, zscore)

LO_MM = 0.5          # физические рамки predict.py
TOP_SHARE = 0.10     # доля сегментов в приоритете проверки (predict.py)
BOTTOM_DEG = (120.0, 240.0)  # донная часть трубы (file.pdf: 96% внутренних дефектов Куст-2)
TOL_MM = 1e-6        # допуск сверки декомпозиции с пересчётом
TOL_CSV = 6e-4       # допуск сверки с result.csv / uncertainty.csv (округление до 0.001)

CASE1_TERMS = {  # слагаемое -> (столбец, знак, человеческое имя)
    "q02": ("prev_q02", +1, "2-й процентиль остаточной стенки в сегменте на прошлом ВТД"),
    "q10": ("prev_q10", +1, "10-й процентиль остаточной стенки в сегменте на прошлом ВТД"),
    "q10_nb3": ("prev_q10_nb3", +1, "10-й процентиль, среднее по сегменту и двум соседям"),
    "ndef_w5": ("prev_ndef_w5", -1, "плотность дефектов прошлого ВТД в окне ±2 сегмента"),
}
PRIOR_NAMES = {
    "slope": "уклон", "lowness_250m": "высота над локальным дном (±250 м)",
    "lowness_1km": "высота над локальным дном (±1 км)", "z_rel": "отметка относительно средней по трубе",
    "water_trap": "ловушка воды (низина перед подъёмом)", "climb_len": "длина затяжного подъёма",
    "climb_rise": "набор высоты на подъёме", "climb_pos": "позиция на подъёме",
    "rise_500m": "подъём за 500 м", "sag_5": "прогиб профиля (окно 5)", "sag_11": "прогиб (окно 11)",
    "sag_31": "прогиб (окно 31)", "sag_101": "прогиб (окно 101)", "curv": "кривизна профиля",
    "vbottom": "V-образное дно", "catch_left": "водосбор слева", "catch_right": "водосбор справа",
    "dist_to_min": "расстояние до локального минимума", "pocket_10": "глубина кармана (окно 10)",
    "pocket_25": "глубина кармана (окно 25)", "pocket_100": "глубина кармана (окно 100)",
    "z_norm": "нормированная отметка", "z_rank": "ранг отметки", "pocket_depth": "глубина кармана",
}


# ------------------------------------------------------------------ слой 1: декомпозиция
def _final(raw: np.ndarray, shift: float, wt_nom: float) -> np.ndarray:
    return np.clip(raw - shift, LO_MM, wt_nom)


def _case1(grp: pd.DataFrame, b: dict) -> tuple[pd.DataFrame, dict, np.ndarray]:
    name, smooth = PREDICTOR["case1"]
    if name != "dens_quant_cal" or smooth:
        raise NotImplementedError(f"декомпозиция написана для dens_quant_cal без сглаживания, "
                                  f"а PREDICTOR = {name}, smooth={smooth}")
    models, X = b["models"], grp[b["features"]]
    agg = b.get("member_agg", "mean")
    preds = predict_bag(models["bag"], X, grp["wt_nom"].values, 1.0, agg=agg)
    p_def = models["clf"].predict_proba(X)[:, 1]
    q05 = np.mean([m.predict(X) for m in models["q05_pair"]], axis=0)
    shape = (predict_bag(models["shape_bag"], X, grp["wt_nom"].values, agg=agg)["ensemble"]
             if "shape_bag" in models else preds["ensemble"])
    eb = blend_prob(shape, p_def, b["blend_w"], gap=shape - q05, gap_w=b.get("gap_w", 0.0))
    if b.get("calib") is not None:
        raise NotImplementedError("calib != None не поддержан")
    k_scale = float(b.get("quant_scale", 1.0)) if not isinstance(b.get("quant_scale"), str) else 1.0
    ref = case1_stat_predictors(grp, eb, b.get("quant_scale", "ens"))[name]

    zs = {t: sgn * zscore(grp[col].to_numpy(float)) for t, (col, sgn, _) in CASE1_TERMS.items()}
    s = sum(zs.values())
    level = float(np.mean(eb))
    sd_s = float(np.std(s))
    k = k_scale * float(np.std(eb)) / sd_s if sd_s > 1e-12 else 0.0
    contrib = pd.DataFrame({f"c_{t}": k * z for t, z in zs.items()}, index=grp.index)
    raw = level + contrib.sum(axis=1).to_numpy()
    err = float(np.max(np.abs(raw - ref)))
    assert err < TOL_MM, f"кейс 1: декомпозиция расходится с case1_stat_predictors на {err:.2e} мм"
    meta = dict(level_mm=level, level_desc="среднее по трубе бленда ансамбля LGBM+XGB+AFT "
                "(медиана членов) с классификатором дефекта (ens_blend)",
                scale_k=k, ens_blend_std=float(np.std(eb)), quant_scale=k_scale, shift_mm=0.0)
    return contrib, meta, raw


def _case2(grp: pd.DataFrame, b: dict, pipe_id: int, dir_of: dict) -> tuple[pd.DataFrame, dict, np.ndarray]:
    name, smooth = PREDICTOR["case2"]
    if name != "ens_prior_cal" or smooth:
        raise NotImplementedError(f"декомпозиция написана для ens_prior_cal, а PREDICTOR = {name}")
    models, X = b["models"], grp[b["features"]]
    preds = predict_bag(models["bag"], X, grp["wt_nom"].values, 1.0, agg=b.get("member_agg", "mean"))
    ens = preds["ensemble"]
    prior = models["relief_prior"]
    Xp = grp[F.PRIOR_FEATS].fillna(0.0)
    p = prior.decision_function(Xp)
    sc, lr = prior.steps[0][1], prior.steps[-1][1]
    xs = sc.transform(Xp)
    # −логит, центрированный по трубе: −Σ coef_j·(xs_j − mean_j); /std(p) = z(−P)
    parts = -(xs - xs.mean(axis=0)) * lr.coef_[0]
    sd_p = float(np.std(p))
    w = b["prior_w"]
    const_ens = float(np.std(ens)) <= 1e-9
    zp = parts / sd_p if sd_p > 1e-12 else np.zeros_like(parts)
    if const_ens:  # train.prior_blend: mean(ens) + z(−P)
        terms, a = {}, 1.0
        prior_terms = zp
    else:          # blend_prob: zscore(z(ens) + w·z(−P))·std(ens) + mean(ens)
        bsum = zscore(ens) + w * zscore(-p)
        a = float(np.std(ens)) / float(np.std(bsum))
        terms = {"ens": zscore(ens)}
        prior_terms = w * zp
    shaped = prior_blend(ens, p, w)
    rates = analog_rates(models["analog_rows"], dir_of[pipe_id], dir_of)
    wt_nom, age = float(grp["wt_nom"].iloc[0]), float(grp["age_end"].iloc[0])
    m_t = wt_nom - float(np.mean(rates)) * age
    hi, mu = float(np.max(shaped)), float(np.mean(shaped))
    bcoef = max((wt_nom - m_t) / (hi - mu) if hi - mu > 1e-9 else 0.0, 0.0)
    ref = calibrate_level(shaped, wt_nom, age, rates)

    cols = {f"c_{t}": bcoef * a * z for t, z in terms.items()}
    cols.update({f"c_{f}": bcoef * a * prior_terms[:, j] for j, f in enumerate(F.PRIOR_FEATS)})
    contrib = pd.DataFrame(cols, index=grp.index)
    raw = m_t + contrib.sum(axis=1).to_numpy()
    err = float(np.max(np.abs(raw - ref)))
    assert err < TOL_MM, f"кейс 2: декомпозиция расходится с calibrate_level на {err:.2e} мм"
    shift = max(0.0, float(np.quantile(ref, 0.99)) - wt_nom)
    meta = dict(level_mm=m_t, level_desc=(f"номинал {wt_nom:g} мм − средняя скорость потери "
                f"аналогов того же направления {float(np.mean(rates)):.4f} мм/год × возраст {age:.1f} лет"),
                analog_rate_mm_y=float(np.mean(rates)), n_analogs=int(len(rates)),
                ens_const=const_ens, ens_value=float(np.mean(ens)), scale_b=bcoef,
                prior_intercept=float(lr.intercept_[0]), shift_mm=shift)
    return contrib, meta, raw


def decompose() -> tuple[pd.DataFrame, dict]:
    """Вклады в мм по сегментам обеих целевых труб + сверка с result.csv."""
    pred_ds = pd.read_csv(C.PROCESSED_DIR / "predict_dataset.csv", parse_dates=["start", "end"])
    bundle = joblib.load(C.ARTIFACTS_DIR / "models.joblib")
    dir_of = dict(prepare.load_passport()[["id", "direction"]].itertuples(index=False))
    out, metas = [], {}
    for pid, grp in pred_ds.groupby("id"):
        pid = int(pid)
        case = {C.CASE1_ID: "case1", C.CASE2_ID: "case2"}[pid]
        b = bundle["cases"][case]
        contrib, meta, raw = (_case1(grp, b) if case == "case1"
                              else _case2(grp, b, pid, dir_of))
        wt = grp["wt_nom"].to_numpy(float)
        final = _final(raw, meta["shift_mm"], wt)
        df = grp[["id", "segment_id", "wt_nom"]].copy()
        df["case"] = case
        df["level"] = meta["level_mm"]
        df = pd.concat([df, contrib], axis=1)
        df["raw"] = raw
        df["shift"] = -meta["shift_mm"]
        df["clip"] = final - (raw - meta["shift_mm"])
        df["thickness_pred"] = final
        meta["terms"] = list(contrib.columns)
        metas[case] = meta
        out.append(df)
    dec = pd.concat(out, ignore_index=True)
    res = pd.read_csv(C.ROOT / "result.csv")
    chk = dec.merge(res, on=["id", "segment_id"], suffixes=("", "_csv"))
    assert len(chk) == len(res) == len(dec), "набор сегментов не совпадает с result.csv"
    err = float((chk["thickness_pred"] - chk["thickness_pred_csv"]).abs().max())
    assert err < TOL_CSV, f"сумма вкладов расходится с result.csv на {err:.4f} мм"
    terms = [c for c in dec.columns if c.startswith("c_")]
    total = dec["level"] + dec[terms].fillna(0).sum(axis=1) + dec["shift"] + dec["clip"]
    assert float((total - dec["thickness_pred"]).abs().max()) < TOL_MM
    return dec, metas


# ------------------------------------------------------------------ слой 2: ранжирование
def ranking(dec: pd.DataFrame) -> pd.DataFrame:
    """Точное правило predict.py: p10 (нижняя граница 80%-интервала), топ ceil(10%) наименьших,
    при равенстве — меньший segment_id (nsmallest keep='first' по порядку сегментов)."""
    unc = pd.read_csv(C.ARTIFACTS_DIR / "uncertainty.csv")
    df = dec[["id", "segment_id", "case", "thickness_pred"]].merge(
        unc[["id", "segment_id", "p10", "p90"]], on=["id", "segment_id"])
    parts = []
    for _, g in df.groupby("id"):
        g = g.sort_values("segment_id").copy()
        n = len(g)
        k = max(1, int(math.ceil(n * TOP_SHARE)))
        order = np.lexsort((g["segment_id"].to_numpy(), g["p10"].to_numpy()))
        rank = np.empty(n, int)
        rank[order] = np.arange(1, n + 1)
        g["rank"] = rank
        g["n"] = n
        g["k_top"] = k
        g["threshold_p10"] = float(g["p10"].to_numpy()[order[k - 1]])
        g["in_top"] = g["rank"] <= k
        g["rank_by_pred"] = g["thickness_pred"].rank(method="first").astype(int)
        g["lower_width"] = g["thickness_pred"] - g["p10"]
        parts.append(g)
    r = pd.concat(parts, ignore_index=True)
    top = pd.read_csv(C.ARTIFACTS_DIR / "top_risk_segments.csv")
    ours = set(map(tuple, r.loc[r["in_top"], ["id", "segment_id"]].to_numpy()))
    theirs = set(map(tuple, top[["id", "segment_id"]].to_numpy()))
    # uncertainty.csv округлён до 0.001 — на пороге возможны равенства, которых не было до округления
    diff = ours ^ theirs
    border = r.set_index(["id", "segment_id"]).loc[list(diff), "p10"] if diff else pd.Series(dtype=float)
    thr = r.groupby("id")["threshold_p10"].first()
    assert all(abs(v - thr[i]) <= 1e-3 for (i, _), v in border.items()), \
        f"топ-10% не совпадает с top_risk_segments.csv: {sorted(diff)[:10]}"
    r["in_top"] = [(i, s) in theirs for i, s in zip(r["id"], r["segment_id"])]
    return r


def rule_text(row: pd.Series, conf: float | None) -> str:
    """Текст правила ранжирования для сегмента."""
    s = (f"Ранг {row['rank']} из {row['n']} по p10 (нижняя граница 80%-интервала) = "
         f"{row['p10']:.3f} мм. В приоритет проверки входят {row['k_top']} сегментов (10%) с наименьшим "
         f"p10; порог p10 ≤ {row['threshold_p10']:.3f} мм; при равенстве p10 раньше идёт меньший "
         f"номер сегмента. Сегмент {'В ПРИОРИТЕТЕ' if row['in_top'] else 'не в приоритете'}.")
    if conf is not None:
        s += (f" p10 = прогноз − {conf:.3f} мм (конформная полуширина одна на трубу), поэтому порядок "
              f"по p10 совпадает с порядком по прогнозу толщины (ранг по прогнозу {row['rank_by_pred']}).")
    else:
        s += (f" p10 = прогноз − {row['lower_width']:.3f} мм (ширина нижнего хвоста квантильной модели "
              f"меняется по сегментам), ранг по самому прогнозу — {row['rank_by_pred']}.")
    return s


# ------------------------------------------------------------------ слой 3: карточка
def _prev_defects(pred_ds: pd.DataFrame) -> pd.DataFrame:
    """Дефекты прошлого ВТД цели кейса 1 в координатах прогноза — тот же путь, что features.build_rows."""
    passport = prepare.load_passport()
    altitudes = prepare.load_altitudes()
    nseg = prepare.n_segments(altitudes)
    vtd = prepare.load_vtd()
    out = []
    for pid, grp in pred_ds[pred_ds["kind"] == "vtd2vtd"].groupby("id"):
        start = pd.Timestamp(grp["start"].iloc[0])
        if align.MODE == "profile":
            f = align.to_profile(vtd, passport, pid, start, None,
                                 method=align.CASE1_SHIFT_METHOD if pid == C.CASE1_ID else None)
        else:
            f = align.shift_for_pair(vtd, passport, pid, start, pd.Timestamp(grp["end"].iloc[0]),
                                     has_target=False)
        sub = (align.shifted_vtd(vtd, pid, start, f, int(nseg.loc[pid])) if f is not None
               else vtd[(vtd["id"] == pid) & (vtd["run_date"] == start)])
        out.append(sub)
    d = pd.concat(out, ignore_index=True) if out else vtd.iloc[0:0]
    # сверка: число дефектов по сегментам = prev_ndef матрицы прогноза
    cnt = d.dropna(subset=["Residual Wall Thickness"]).groupby(["id", "segment_id"]).size()
    m = pred_ds[pred_ds["kind"] == "vtd2vtd"].set_index(["id", "segment_id"])["prev_ndef"]
    got = cnt.reindex(m.index).fillna(0)
    assert np.allclose(got.to_numpy(), m.to_numpy()), "дефекты прошлого ВТД не совпали с prev_ndef"
    return d


def _regime_gaps() -> dict:
    g = W.query("""select pipe_id as id, count(*) as n_days, sum(has_anomaly::int) as n_anom,
                          max(gap) as max_gap, min(calc_date) as d0, max(calc_date) as d1
                   from (select *, date_diff('day', lag(calc_date) over (partition by pipe_id
                         order by calc_date), calc_date) as gap from core.regime_daily)
                   group by 1""")
    return {int(r.id): r for r in g.itertuples()}


def _r(x, nd=3):
    return None if x is None or (isinstance(x, float) and not np.isfinite(x)) else round(float(x), nd)


def cards(dec: pd.DataFrame, rk: pd.DataFrame, metas: dict) -> list[dict]:
    pred_ds = pd.read_csv(C.PROCESSED_DIR / "predict_dataset.csv", parse_dates=["start", "end"])
    bundle = joblib.load(C.ARTIFACTS_DIR / "models.joblib")
    passport = prepare.load_passport().set_index("id")
    defects = _prev_defects(pred_ds)
    vt = defects.dropna(subset=["Residual Wall Thickness"]).copy()
    # класс дефекта (в prepare.load_vtd его нет) — по ключу исходной записи
    cls = W.query("""select pipe_id as id, run_date, residual_mm, angle_deg, depth_pct,
                            length_mm, defect_class from core.ili_feature
                     where residual_mm is not null""")
    keycols = ["Residual Wall Thickness", "Angle", "Defect Depth in %", "Feature Length"]
    vt["key"] = list(zip(vt["id"], pd.to_datetime(vt["run_date"]), *[vt[c] for c in keycols]))
    cls["key"] = list(zip(cls["id"], pd.to_datetime(cls["run_date"]), cls["residual_mm"],
                          cls["angle_deg"], cls["depth_pct"], cls["length_mm"]))
    cmap = dict(zip(cls["key"], cls["defect_class"]))
    gaps = _regime_gaps()
    coupons = W.query("select linked_pipe_id, count(*) n from core.corrosion_coupon group by 1")
    cp = {int(r.linked_pipe_id): int(r.n) for r in coupons.dropna().itertuples()}
    dirs = passport["direction"]

    # базовые доли по трубе — чтобы сравнивать сегмент с фоном, а не с нулём
    base = {}
    for pid, g in vt.groupby("id"):
        inn = g[g["Defect Type"] == "internal"]
        base[int(pid)] = dict(
            bottom_share_internal=_r(inn["Angle"].between(*BOTTOM_DEG).mean()),
            ndef_per_seg=_r(len(g) / len(pred_ds[pred_ds["id"] == pid]), 2))

    X = pred_ds.set_index(["id", "segment_id"])
    D = dec.set_index(["id", "segment_id"])
    R = rk.set_index(["id", "segment_id"])
    out = []
    for (pid, sid), row in D.iterrows():
        pid, sid = int(pid), int(sid)
        x, r, case = X.loc[(pid, sid)], R.loc[(pid, sid)], row["case"]
        conf = bundle["cases"][case].get("conformal")
        terms = [c for c in metas[case]["terms"]]
        contrib = sorted(((c[2:], float(row[c])) for c in terms), key=lambda t: t[1])
        pas = passport.loc[pid]
        card = dict(
            id=pid, segment_id=sid, case=case,
            dist_m=[sid * C.SEG_LEN, (sid + 1) * C.SEG_LEN],
            forecast=dict(date=str(x["end"].date()), thickness_mm=_r(row["thickness_pred"]),
                          wt_nom_mm=_r(row["wt_nom"]), p10=_r(r["p10"]), p90=_r(r["p90"])),
            # --- поведение модели (слой 1): точные вклады, сумма = прогноз
            model=dict(level_mm=_r(row["level"]), level_desc=metas[case]["level_desc"],
                       contributions_mm={k: _r(v, 4) for k, v in contrib},
                       shift_mm=_r(row["shift"], 4), clip_mm=_r(row["clip"], 4),
                       check="level + Σ contributions + shift + clip = thickness_mm"),
            # --- ранжирование (слой 2)
            ranking=dict(rank=int(r["rank"]), n=int(r["n"]), k_top=int(r["k_top"]),
                         threshold_p10=_r(r["threshold_p10"]), in_top=bool(r["in_top"]),
                         rule=rule_text(r, conf["p10_p90"] if conf else None)),
            observation={}, hypotheses=[], missing=[])
        obs, hyp, miss = card["observation"], card["hypotheses"], card["missing"]
        obs["pipe"] = dict(direction=dirs.loc[pid], d_mm=_r(x["d_mm"], 0), wt_nom_mm=_r(x["wt_nom"]),
                           coated=bool(x["coated"]), age_years=_r(x["age_end"], 1))
        obs["relief"] = {f: _r(x[f]) for f in ("z", "slope", "lowness_250m", "pocket_depth",
                                               "water_trap", "climb_len", "climb_rise")}
        obs["regime_pipe_level"] = dict(watercut_pct=_r(x["rg_watercut_mean"], 2),
                                        v_mean_m_s=_r(x["rg_v_mean"]),
                                        share_slow=_r(x["rg_share_slow"]), t_at_c=_r(x["t_at"], 1))
        gp = gaps.get(pid)
        if gp is not None:
            obs["regime_pipe_level"].update(days=int(gp.n_days), anomaly_days=int(gp.n_anom or 0),
                                            max_gap_days=int(gp.max_gap or 0))
            if (gp.max_gap or 0) > 30:
                miss.append(f"техрежим: пропуск до {int(gp.max_gap)} суток подряд; режим один на всю "
                            "трубу, по сегментам не меняется (кроме линейной T/P вдоль трубы)")
        else:
            miss.append("техрежима по трубе нет")
        miss.append("режим и химия — средние по трубе, локальной обводнённости сегмента нет")
        if pid not in cp:
            miss.append("образцов-свидетелей, привязанных к этой трубе, нет"
                        + (" (есть у соседней трубы того же направления)"
                           if any(dirs.get(k) == dirs.loc[pid] for k in cp) else ""))

        if x["kind"] == "vtd2vtd":
            seg = vt[(vt["id"] == pid) & (vt["segment_id"] == sid)]
            nb = vt[(vt["id"] == pid) & vt["segment_id"].between(sid - 2, sid + 2)]
            inn = seg[seg["Defect Type"] == "internal"]
            ext = seg[seg["Defect Type"] == "external"]
            obs["prev_ili"] = dict(
                date=str(pd.Timestamp(x["start"]).date()), n_defects=int(len(seg)),
                n_defects_pm2=int(len(nb)), pipe_mean_per_segment=base[pid]["ndef_per_seg"],
                n_internal=int(len(inn)), n_external=int(len(ext)),
                min_residual_mm=_r(seg["Residual Wall Thickness"].min()) if len(seg) else None,
                max_depth_pct=_r(seg["Defect Depth in %"].max(), 1) if len(seg) else None,
                internal_bottom_share=_r(inn["Angle"].between(*BOTTOM_DEG).mean()) if len(inn) else None,
                pipe_internal_bottom_share=base[pid]["bottom_share_internal"],
                prev_q02_mm=_r(x["prev_q02"]), prev_q10_mm=_r(x["prev_q10"]),
                prev_ndef_w5=_r(x["prev_ndef_w5"]))
            miss.append("положение дефектов прошлого ВТД перенесено в координаты профиля выравниванием "
                        "(по кольцевым швам); ошибка сдвига ~0.2–0.5 м против сегмента 10 м — на границах "
                        "сегмента дефект может принадлежать соседу")
            pi = obs["prev_ili"]
            pi["classes"] = (seg["key"].map(cmap).fillna("не указан")
                             .value_counts().head(3).to_dict())
            rg = obs["regime_pipe_level"]
            if len(seg) >= 2 * base[pid]["ndef_per_seg"] and len(inn):
                hyp.append(dict(
                    claim="зона активной внутренней коррозии продолжает развиваться",
                    support=[f"{len(seg)} дефектов в сегменте при среднем по трубе "
                             f"{base[pid]['ndef_per_seg']}, {len(nb)} в ±2 сегментах",
                             f"остаток уже {pi['min_residual_mm']} мм (номинал {x['wt_nom']:g})"],
                    status="наблюдение прошлого ВТД + допущение, что процесс идёт там же "
                           "(на 22871 2018→2022 это допущение объясняет ~22% разброса, self22)",
                    lacks="скорости роста отдельных дефектов: дефекты между пропусками не сопоставляются "
                          "(совпадение ~4%)"))
            bs, b0 = pi["internal_bottom_share"], pi["pipe_internal_bottom_share"]
            if len(inn) >= 5 and bs is not None and bs >= b0 + 0.1:
                hyp.append(dict(
                    claim="механизм — донная коррозия: вода отделяется и идёт по нижней образующей",
                    support=[f"{bs:.0%} внутренних дефектов сегмента на 120–240° (фон трубы {b0:.0%})",
                             f"обводнённость {rg['watercut_pct']}%, средняя скорость "
                             f"{rg['v_mean_m_s']} м/с"],
                    status="гипотеза: положение дефектов согласуется, механизм не измерен",
                    lacks="локальной скорости/расслоения потока и состава воды в сегменте"))
            elif len(inn) >= 5 and bs is not None and bs <= b0 - 0.1:
                hyp.append(dict(
                    claim="донная картина не выражена: дефекты распределены по окружности",
                    support=[f"{bs:.0%} внутренних дефектов на 120–240° при фоне трубы {b0:.0%}"],
                    status="наблюдение; механизм по данным не определяется",
                    lacks="данных о режиме течения в сегменте (расслоение/эмульсия)"))
            if len(ext):
                hyp.append(dict(
                    claim="наружная коррозия",
                    support=[f"{len(ext)} наружных дефектов", "труба без покрытия"
                             if not x["coated"] else "покрытие есть"],
                    status="гипотеза",
                    lacks="состояния изоляции и катодной защиты по сегменту"))
            if not len(seg) and not len(nb):
                hyp.append(dict(claim="признаков утонения на прошлом ВТД нет: прогноз ≈ уровень трубы",
                                support=["0 дефектов в сегменте и ±2 соседях"], status="наблюдение",
                                lacks=""))
        else:
            obs["prev_ili"] = None
            miss.append("на этой трубе не было ни одного ВТД: прогноз формы — только по рельефу "
                        "(логрегрессия на трубах того же режима), дефекты сегмента не наблюдались")
            top = [k for k, v in contrib[:3] if v < 0]
            if top and sum(v for _, v in contrib) < 0:
                hyp.append(dict(
                    claim="повышенный риск по рельефу: у аналогов (трубы ЦППН) дефекты чаще в таких местах",
                    support=[f"{PRIOR_NAMES.get(k, k)}: {_r(x[k])} (вклад {dict(contrib)[k]:+.3f} мм)"
                             for k in top],
                    status="статистическая связь на других трубах (AUC переноса ~0.58), не наблюдение",
                    lacks="ВТД/УЗТ на этой трубе"))
        out.append(card)
    return out


def render_card(c: dict) -> str:
    """Детерминированный текст карточки (без LLM)."""
    f, m = c["forecast"], c["model"]
    names = {t: v[2] for t, v in CASE1_TERMS.items()} | PRIOR_NAMES
    contrib = sorted(((k, v) for k, v in m["contributions_mm"].items() if abs(v) >= 0.005),
                     key=lambda t: -abs(t[1]))
    lines = [f"### {c['id']} · сегмент {c['segment_id']} ({c['dist_m'][0]:.0f}–{c['dist_m'][1]:.0f} м)",
             f"Прогноз на {f['date']}: **{f['thickness_mm']:.3f} мм** (номинал {f['wt_nom_mm']:g}, "
             f"80%-интервал {f['p10']:.3f}–{f['p90']:.3f}).", "",
             "**Почему такое число** (точно, сумма = прогноз):",
             f"- уровень трубы {m['level_mm']:.3f} мм — {m['level_desc']}"]
    for k, v in contrib[:6]:
        lines.append(f"- {v:+.3f} мм — {names.get(k, k)}")
    rest = sum(v for _, v in contrib[6:])
    if contrib[6:]:
        lines.append(f"- {rest:+.3f} мм — прочие слагаемые ({len(contrib) - 6})")
    small = sum(v for k, v in m["contributions_mm"].items() if abs(v) < 0.005)
    if abs(small) >= 0.0005:
        lines.append(f"- {small:+.3f} мм — слагаемые меньше 0.005 мм")
    if m["shift_mm"]:
        lines.append(f"- {m['shift_mm']:+.3f} мм — сдвиг профиля (p99 на номинал)")
    if m["clip_mm"]:
        lines.append(f"- {m['clip_mm']:+.3f} мм — физические рамки [0.5, номинал]")
    lines += ["", f"**Почему в приоритете:** {c['ranking']['rule']}", "", "**Наблюдение:**"]
    pi = c["observation"].get("prev_ili")
    if pi:
        lines.append(f"- ВТД {pi['date']}: {pi['n_defects']} дефектов в сегменте "
                     f"(в среднем по трубе {pi['pipe_mean_per_segment']}), {pi['n_defects_pm2']} в ±2 сегментах; "
                     f"мин. остаток {pi['min_residual_mm']} мм, макс. глубина {pi['max_depth_pct']}%; "
                     f"внутренних {pi['n_internal']}, наружных {pi['n_external']}; "
                     f"классы: {', '.join(f'{k} {v}' for k, v in pi['classes'].items()) or '—'}")
    rl, rg = c["observation"]["relief"], c["observation"]["regime_pipe_level"]
    lines.append(f"- рельеф: отметка {rl['z']} м, уклон {rl['slope']}, над локальным дном {rl['lowness_250m']} м, "
                 f"карман {rl['pocket_depth']} м")
    lines.append(f"- режим (вся труба): обводнённость {rg['watercut_pct']}%, скорость {rg['v_mean_m_s']} м/с, "
                 f"доля медленного течения {rg['share_slow']}")
    lines += ["", "**Инженерная гипотеза:**"]
    lines += [f"- {h['claim']} — {'; '.join(h['support'])}. *{h['status']}*"
              + (f"; не хватает: {h['lacks']}" if h["lacks"] else "") for h in c["hypotheses"]] or ["- нет"]
    lines += ["", "**Чего нет в данных:**"] + [f"- {s}" for s in c["missing"]]
    return "\n".join(lines)


def run() -> None:
    dec, metas = decompose()
    rk = ranking(dec)
    dec.merge(rk[["id", "segment_id", "p10", "rank", "in_top"]], on=["id", "segment_id"]).round(5).to_csv(
        C.ARTIFACTS_DIR / "explain_contrib.csv", index=False)
    cs = cards(dec, rk, metas)
    with open(C.ARTIFACTS_DIR / "explain_cards.jsonl", "w") as fh:
        for c in cs:
            fh.write(json.dumps(c, ensure_ascii=False) + "\n")
    top = sorted((c for c in cs if c["ranking"]["in_top"]),
                 key=lambda c: (c["id"], c["ranking"]["rank"]))
    md = ["# Интерпретация прогноза: сегменты в приоритете проверки", "",
          "Слой 1 — точная декомпозиция (сверена с result.csv), слой 2 — правило ранжирования "
          "(сверено с top_risk_segments.csv), слой 3 — наблюдение / гипотеза / чего нет.", ""]
    md += [render_card(c) + "\n" for c in top]
    (C.ARTIFACTS_DIR / "explain_top.md").write_text("\n".join(md))
    for case, m in metas.items():
        print(case, {k: v for k, v in m.items() if k != "terms"})
    print(f"карточек {len(cs)}, в приоритете {len(top)}; сверка с result.csv и топ-10% пройдена")


if __name__ == "__main__":
    run()
