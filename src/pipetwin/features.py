"""Этап 2: признаки сегментов — геометрия трассы, режим, прошлое ВТД, гравиметрия."""
import os

import numpy as np
import pandas as pd

from . import align
from . import config as C
from . import prepare
from . import warehouse as W

YEAR = pd.Timedelta(days=365.25)


# ---------------------------------------------------------------- геометрия
def geometry_features(altitudes: pd.DataFrame, nseg: pd.Series) -> pd.DataFrame:
    """Признаки профиля на центр каждого сегмента."""
    out = []
    for pipe_id, grp in altitudes.groupby("id"):
        n = nseg.loc[pipe_id]
        centers = (np.arange(n) + 0.5) * C.SEG_LEN
        z = np.interp(centers, grp["total_distance"], grp["z"])
        zs = pd.Series(z)
        df = pd.DataFrame({"id": pipe_id, "segment_id": np.arange(n)})
        df["z"] = z
        df["slope"] = np.gradient(z, C.SEG_LEN)  # м/м, >0 — подъём по потоку
        # «низинность»: насколько сегмент выше локального минимума в окне
        df["lowness_250m"] = z - zs.rolling(51, center=True, min_periods=1).min().values
        df["lowness_1km"] = z - zs.rolling(201, center=True, min_periods=1).min().values
        df["z_rel"] = z - z.mean()
        # ловушка воды: низина (локальный минимум) с подъёмом после неё
        uphill_ahead = zs.shift(-3) - zs
        df["water_trap"] = ((df["lowness_250m"] < 0.1) & (uphill_ahead.values > 0.5)).astype(int)
        # глубина кармана: насколько сегмент ниже обоих окрестных гребней —
        # непрерывная мера объёма стоячей воды (донная коррозия, см. file.pdf)
        left_max = zs.rolling(50, min_periods=1).max()
        right_max = zs[::-1].rolling(50, min_periods=1).max()[::-1]
        df["pocket_depth"] = (np.minimum(left_max, right_max) - zs).clip(lower=0).values
        # затяжные подъёмы (консультация практика, experiments/lab8): поток теряет
        # энергию, эмульсия расслаивается, вода и мехпримеси идут по низу трубы
        zsm = zs.rolling(11, center=True, min_periods=1).mean()
        up = (zsm.diff().fillna(0) > 0).astype(int)
        run = (up != up.shift()).cumsum()
        g = pd.DataFrame({"up": up, "run": run, "zsm": zsm})
        run_len = g.groupby("run")["up"].transform("size") * C.SEG_LEN
        run_rise = g.groupby("run")["zsm"].transform(lambda s: s.iloc[-1] - s.iloc[0])
        df["climb_len"] = np.where(up == 1, run_len, 0.0)
        df["climb_rise"] = np.where(up == 1, run_rise, 0.0)
        df["climb_pos"] = np.where(up == 1, g.groupby("run").cumcount() * C.SEG_LEN, 0.0)
        df["rise_500m"] = (zsm - zsm.shift(50)).clip(lower=0).fillna(0).values
        df["dist_m"] = centers
        df["dist_frac"] = centers / (n * C.SEG_LEN)
        out.append(df)
    return pd.concat(out, ignore_index=True)


# ------------------------------------------------------------------- режим
def load_regime() -> pd.DataFrame:
    """Очищенный суточный режим (core.regime_daily): один расчёт на сутки,
    физически невозможные нули и сбои расчёта -> NaN (в средние не входят)."""
    return W.query("""
        select pipe_id as id, calc_date, watercut_pct as watercut,
               v_liquid_m_s as v_liquid_true, v_mix_m_s as v_mix, gas_content_rate,
               p_start_atm as p_start, t_start_c as t_start, t_mix_c as t_mix,
               p_end_atm as p_end, t_end_c as t_end,
               pit_corrosion_intensity, q_liquid as q, flow_regime
        from core.regime_daily order by pipe_id, calc_date""")


def regime_features(regime: pd.DataFrame, pipe_id: int,
                    start: pd.Timestamp, end: pd.Timestamp) -> dict:
    """Агрегаты режима за горизонт прогноза (по доступной части окна)."""
    w = regime[(regime["id"] == pipe_id)
               & (regime["calc_date"] >= start) & (regime["calc_date"] <= end)]
    if w.empty:  # режим начинается позже ввода — берём всю историю участка
        w = regime[regime["id"] == pipe_id]
    years = (end - start) / YEAR
    t = w["t_start"].fillna(w["t_mix"])
    # доли режимов течения (experiments/lab8); окно без разметки -> вся история
    fr = w["flow_regime"].dropna()
    if fr.empty:
        fr = regime.loc[regime["id"] == pipe_id, "flow_regime"].dropna()
    shares = fr.value_counts(normalize=True)
    sh = (lambda k: shares.get(k, 0.0)) if len(fr) else (lambda k: np.nan)
    return dict(
        rg_watercut_mean=w["watercut"].mean(),
        rg_watercut_p90=w["watercut"].quantile(0.9),
        rg_v_mean=w["v_liquid_true"].mean(),
        rg_v_p10=w["v_liquid_true"].quantile(0.1),
        rg_share_slow=(w["v_liquid_true"] < 0.3).mean(),  # расслоение потока
        rg_gas_mean=w["gas_content_rate"].mean(),
        rg_p_mean=w["p_start"].mean(),
        rg_t_mean=t.mean(),
        rg_pit_mean=w["pit_corrosion_intensity"].mean(),
        rg_pit_cum=w["pit_corrosion_intensity"].mean() * years,  # мм за горизонт
        rg_q_mean=w["q"].mean(),
        rg_share_laminar=sh("Ламинарный"),
        rg_share_trans=sh("Переходный"),
        rg_share_turb=sh("Турбулентный"),
        # граничные T/P участка — сырьё для интерполяции вдоль дистанции
        # (experiments/lab12); из датасета удаляются в build_rows
        tp_t_start=w["t_start"].mean(),
        tp_t_end=w["t_end"].mean(),
        tp_p_start=w["p_start"].mean(),
        tp_p_end=w["p_end"].mean(),
    )


# --------------------------------------------------------------------- УЗТ
def load_uzt() -> pd.DataFrame:
    """Только правдоподобные замеры УЗТ (толщина ≤ номинал·1.15). Сырые 67 замеров толще
    номинала на постоянные ~7 мм (сдвиг нуля прибора, core.ut_measurement.ut_offset_mm);
    PIPETWIN_UZT=corr (по умолчанию) берёт толщину за вычетом сдвига, raw — сырую (таблица
    пуста). Кейс 2: r² 0.181 -> 0.193, строгая проверка 0.010 -> 0.016."""
    if os.environ.get("PIPETWIN_UZT", "corr") == "corr":
        return W.query("""
            select pipe_id as id, dist_m as dist, measured_at as date, thickness_corr_mm as thick
            from core.ut_measurement where is_plausible_corr""")
    return W.query("""
        select pipe_id as id, dist_m as dist, measured_at as date, thickness_mm as thick
        from core.ut_measurement where is_plausible""")


def uzt_features(uzt: pd.DataFrame, passport: pd.DataFrame, pipe_id: int,
                 end: pd.Timestamp, n: int) -> pd.DataFrame:
    """Ближайшие замеры УЗТ, сделанные до даты прогноза."""
    df = pd.DataFrame({"segment_id": np.arange(n)})
    pts = uzt[(uzt["id"] == pipe_id) & (uzt["date"] <= end)]
    if pts.empty:
        df["uzt_dist"] = np.nan
        df["uzt_min_250"] = np.nan
        df["uzt_loss_rate"] = np.nan
        return df
    pas = passport.set_index("id").loc[pipe_id]
    centers = (df["segment_id"].values + 0.5) * C.SEG_LEN
    pt = pts.groupby("dist").agg(thick=("thick", "min"),
                                 date=("date", "max")).reset_index()
    d = np.abs(centers[:, None] - pt["dist"].values[None, :])
    nearest = d.argmin(axis=1)
    df["uzt_dist"] = d.min(axis=1)
    within = np.where(d <= 250.0, pt["thick"].values[None, :], np.nan)
    vals = np.full(len(df), np.nan)
    ok = np.isfinite(within).any(axis=1)
    if ok.any():
        vals[ok] = np.nanmin(within[ok], axis=1)
    df["uzt_min_250"] = vals
    age_meas = (pt["date"] - pas["date_in"]).dt.days.values / 365.25
    df["uzt_loss_rate"] = ((pas["wt_nom"] - pt["thick"].values)
                           / np.maximum(age_meas, 1e-6))[nearest]
    return df


# -------------------------------------------------------------- гравиметрия
def gravimetry_by_pipe() -> pd.DataFrame:
    """Образцы-свидетели, привязанные к участкам (core.corrosion_coupon.link_*).

    Привязка по топологии сети сделана в хранилище (warehouse/README.md). Для трубы
    берутся образцы своего участка (linked_pipe_id), если их нет — образцы её
    направления (linked_direction). Слабые связи (только зона защиты ингибитором)
    и водоводы КНС не берутся. Трубы без образцов получают NaN — среднее подставит
    build_rows."""
    return W.query("""
        with c as (
            select * from core.corrosion_coupon
            where link_level not in ('protection_zone', 'water_line', 'unlinked')
        ),
        own as (
            select p.pipe_id, c.* from core.pipe p join c on c.linked_pipe_id = p.pipe_id
        ),
        dir as (
            select p.pipe_id, c.* from core.pipe p join c on c.linked_direction = p.direction
            where p.pipe_id not in (select pipe_id from own)
        ),
        x as (select * from own union all by name select * from dir)
        select pipe_id as id,
               avg(rate_avg_mm_y)          as grav_rate_mean,
               max(rate_max_mm_y)          as grav_rate_max,
               -- Cl- рушит плёнку FeCO3: corr с rate +0.30 (experiments/lab5)
               median(cl_mg_l)             as grav_cl,
               median(mineralization_mg_l) as grav_mineralization
        from x group by 1 order by 1""")


# ------------------------------------------------------- прошлое ВТД / старт
def start_state_features(vtd: pd.DataFrame, runs: pd.DataFrame, nseg: pd.Series,
                         passport: pd.DataFrame, pipe_id: int, start, kind: str,
                         start_age_years: float) -> pd.DataFrame:
    """Состояние стенки на старте горизонта.

    vtd2vtd  — сглаженный профиль минимумов и плотность дефектов прошлого пропуска;
    comm2vtd — «виртуальный пропуск»: номинальная толщина, дефектов нет.
    """
    n = nseg.loc[pipe_id]
    df = pd.DataFrame({"id": pipe_id, "segment_id": np.arange(n)})
    wt_nom = passport.set_index("id").loc[pipe_id, "wt_nom"]

    if kind == "comm2vtd":
        df["prev_min"] = wt_nom
        df["prev_min_sm5"] = wt_nom
        df["prev_min_sm21"] = wt_nom
        df["prev_p25_sm21"] = wt_nom
        df["prev_ndef"] = 0.0
        df["prev_ndef_sm21"] = 0.0
        df["prev_ndef_norm"] = 0.0
        df["prev_maxdepth"] = 0.0
        df["prev_loss_rate"] = 0.0
        df["has_prev"] = 0
        return df

    tgt = prepare.segment_targets(vtd, runs, nseg, pipe_id, start)
    sub = vtd[(vtd["id"] == pipe_id) & (vtd["run_date"] == start)]
    ndef = sub.dropna(subset=["Residual Wall Thickness"]).groupby("segment_id").size()
    depth = sub.groupby("segment_id")["Defect Depth in %"].max()

    s = tgt.set_index("segment_id")["y"]
    df["prev_min"] = df["segment_id"].map(s)
    df["prev_min_sm5"] = s.rolling(5, center=True, min_periods=1).median().reindex(
        df["segment_id"]).values
    df["prev_min_sm21"] = s.rolling(21, center=True, min_periods=1).median().reindex(
        df["segment_id"]).values
    df["prev_p25_sm21"] = s.rolling(21, center=True, min_periods=1).quantile(0.25).reindex(
        df["segment_id"]).values
    df["prev_ndef"] = df["segment_id"].map(ndef).fillna(0.0)
    df["prev_ndef_sm21"] = pd.Series(df["prev_ndef"]).rolling(
        21, center=True, min_periods=1).mean().values
    # нормировка на чувствительность снаряда: доля дефектов пропуска на сегмент
    total_def = max(float(ndef.sum()), 1.0)
    df["prev_ndef_norm"] = df["prev_ndef"] / total_def * 1000.0
    df["prev_maxdepth"] = df["segment_id"].map(depth).fillna(0.0)
    age = max(start_age_years, 1e-6)
    df["prev_loss_rate"] = (wt_nom - df["prev_min"]).clip(lower=0) / age  # мм/год
    df["has_prev"] = 1
    return df


# ------------------------------------------------------------------ сборка
META_COLS = ["id", "segment_id", "kind", "start", "end", "y", "had_defect", "split",
             "aft_lb", "aft_ub"]  # метки survival-модели — не признаки

# группы признаков, подключаемые по кейсам (итог абляций, см. experiments/)
UZT_FEATS = ["uzt_dist", "uzt_min_250", "uzt_loss_rate"]
PROF_FEATS = ["prev_p25_sm21", "prev_ndef_norm"]
INTER_FEATS = ["x_pool_slow", "x_trap_wc"]
ERA_FEATS = ["yrs_pre_inhib", "yrs_post_inhib"]
POCKET_FEATS = ["pocket_depth"]
CHEM_FEATS = ["grav_cl", "grav_mineralization"]
REGIME_SHARE_FEATS = ["rg_share_laminar", "rg_share_trans", "rg_share_turb"]
CLIMB_FEATS = ["climb_len", "climb_rise", "climb_pos", "rise_500m"]
TP_FEATS = ["t_at", "p_at"]
OPTIONAL_FEATS = (UZT_FEATS + PROF_FEATS + INTER_FEATS + ERA_FEATS + POCKET_FEATS
                  + CHEM_FEATS + REGIME_SHARE_FEATS + CLIMB_FEATS + TP_FEATS)


def case_features(ds: pd.DataFrame, case: str) -> list[str]:
    """Наборы по кейсам: case1 — база + доли режимов течения + интерполяция T/P;
    case2 — база + УЗТ + эпохи ингибирования (скорость коррозии по гравиметрии
    упала на порядок после 2012-2013) + затяжные подъёмы + интерполяция T.
    Режимы/подъёмы — experiments/lab8; t_at/p_at — lab12 (p_at кейсу 2 вредит)."""
    base = [c for c in feature_columns(ds) if c not in OPTIONAL_FEATS]
    if case == "case2":
        return base + UZT_FEATS + ERA_FEATS + CLIMB_FEATS + ["t_at"]
    return base + REGIME_SHARE_FEATS + TP_FEATS


def build_rows(pairs: pd.DataFrame, with_target: bool, *, vtd, runs, nseg,
               passport, altitudes, regime, geom, grav, uzt) -> pd.DataFrame:
    pas = passport.set_index("id")
    frames = []
    for _, p in pairs.iterrows():
        pipe_id, start, end, kind = p["id"], p["start"], p["end"], p["kind"]
        age_start = (start - pas.loc[pipe_id, "date_in"]) / YEAR

        df = geom[geom["id"] == pipe_id].copy()
        vtd_start = vtd
        vtd_end = vtd
        if align.MODE == "profile":
            # всё в координатах профиля; у валидационной пары кейса 1 целевой пропуск не
            # используется для оценки сдвига прошлого (как при настоящем прогнозе)
            ex = (pd.Timestamp(end) if align.is_case1_val(pipe_id, start, end) and not align.ORACLE
                  else None)
            if kind == "vtd2vtd":
                vtd_start = align.shifted_vtd(vtd, pipe_id, start,
                                              align.to_profile(vtd, passport, pipe_id, start, ex),
                                              int(nseg.loc[pipe_id]))
            if with_target:
                vtd_end = align.shifted_vtd(vtd, pipe_id, end,
                                            align.to_profile(vtd, passport, pipe_id, end),
                                            int(nseg.loc[pipe_id]))
        elif kind == "vtd2vtd":
            # дистанции прошлого пропуска -> координаты целевого (сбой одометра, align.py)
            f = align.shift_for_pair(vtd, passport, pipe_id, start, end, has_target=with_target)
            if f is not None:
                vtd_start = align.shifted_vtd(vtd, pipe_id, start, f, int(nseg.loc[pipe_id]))
        st = start_state_features(vtd_start, runs, nseg, passport, pipe_id, start, kind, age_start)
        df = df.merge(st, on=["id", "segment_id"])

        for k, v in regime_features(regime, pipe_id, start, end).items():
            df[k] = v
        # пространственная интерполяция техрежима (experiments/lab12): режим
        # дан одним расчётом на участок, но граничные T/P дают линейный
        # профиль вдоль дистанции — единственная вариация режима по трубе
        df["t_at"] = df["tp_t_start"] + df["dist_frac"] * (df["tp_t_end"] - df["tp_t_start"])
        df["p_at"] = df["tp_p_start"] + df["dist_frac"] * (df["tp_p_end"] - df["tp_p_start"])
        df = df.drop(columns=["tp_t_start", "tp_t_end", "tp_p_start", "tp_p_end"])
        df = df.merge(uzt_features(uzt, passport, pipe_id, end, len(df)),
                      on="segment_id")
        # физические взаимодействия: вода стоит в низинах при медленном потоке
        df["x_pool_slow"] = (df["lowness_250m"] < 0.2).astype(float) * df["rg_share_slow"]
        df["x_trap_wc"] = df["water_trap"] * df["rg_watercut_mean"] / 100.0
        df["horizon_years"] = (end - start) / YEAR
        # эпохи ингибирования: по гравиметрии скорость коррозии упала на
        # порядок после 2012-2013 (0.3 -> 0.02 мм/год, experiments/lab5) —
        # горизонт делится на "до" и "после" внедрения ингибиторной программы
        era = pd.Timestamp("2013-01-01")
        df["yrs_pre_inhib"] = max((min(end, era) - start) / YEAR, 0.0)
        df["yrs_post_inhib"] = max((end - max(start, era)) / YEAR, 0.0)
        df["age_start"] = age_start
        df["age_end"] = (end - pas.loc[pipe_id, "date_in"]) / YEAR
        df["wt_nom"] = pas.loc[pipe_id, "wt_nom"]
        df["d_mm"] = pas.loc[pipe_id, "d_mm"]
        df["coated"] = int(pas.loc[pipe_id, "coated"])
        gr = grav[grav["id"] == pipe_id]
        for col in ("grav_rate_mean", "grav_rate_max", "grav_cl", "grav_mineralization"):
            df[col] = gr[col].iloc[0] if len(gr) else grav[col].mean()

        df["kind"], df["start"], df["end"] = kind, start, end
        if with_target:
            tgt = prepare.segment_targets(vtd_end, runs, nseg, pipe_id, end)
            df = df.merge(tgt[["segment_id", "y", "had_defect"]], on="segment_id")
        frames.append(df)
    return pd.concat(frames, ignore_index=True)


def assign_split(ds: pd.DataFrame) -> pd.DataFrame:
    """train / val_case1 (2022->дек.2023 на соседях) / val_case2 (ввод->ВТД-2018).

    Любая другая пара с тем же целевым пропуском, что у валидационной
    (напр. расширенная "ввод -> дек.2023"), выбрасывается — иначе утечка:
    модель видела бы валидационный таргет в обучении.
    """
    ds = ds.copy()
    ds["split"] = "train"
    v1 = ((ds["kind"] == "vtd2vtd")
          & (ds["end"] == pd.Timestamp(C.VAL_CASE1_END))
          & (ds["start"] == pd.Timestamp(C.VAL_CASE1_START)))
    if C.VAL_CASE1_IDS is not None:
        v1 &= ds["id"].isin(C.VAL_CASE1_IDS)
    ds.loc[v1, "split"] = "val_case1"
    for pid, end in C.VAL_CASE2_PAIRS:
        v2 = ((ds["kind"] == "comm2vtd") & (ds["id"] == pid)
              & (ds["end"] == pd.Timestamp(end)))
        ds.loc[v2, "split"] = "val_case2"

    val_targets = set(map(tuple, ds.loc[ds["split"] != "train", ["id", "end"]]
                          .drop_duplicates().itertuples(index=False)))
    leak = (ds["split"] == "train") & ds.apply(
        lambda r: (r["id"], r["end"]) in val_targets, axis=1)
    return ds[~leak].reset_index(drop=True)


def feature_columns(ds: pd.DataFrame) -> list[str]:
    return [c for c in ds.columns if c not in META_COLS]


def build_all(extended: bool = False) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Полный этап подготовки: train-датасет и матрица для прогноза."""
    passport = prepare.load_passport()
    altitudes = prepare.load_altitudes()
    nseg = prepare.n_segments(altitudes)
    vtd = prepare.load_vtd()
    runs = prepare.build_runs(vtd)
    regime = load_regime()
    geom = geometry_features(altitudes, nseg)
    grav = gravimetry_by_pipe()

    ctx = dict(vtd=vtd, runs=runs, nseg=nseg, passport=passport,
               altitudes=altitudes, regime=regime, geom=geom, grav=grav,
               uzt=load_uzt())
    train = build_rows(prepare.build_pairs(runs, passport, extended=extended),
                       with_target=True, **ctx)
    train = assign_split(train)
    predict = build_rows(prepare.prediction_pairs(passport), with_target=False, **ctx)

    C.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    train.to_csv(C.PROCESSED_DIR / "train_dataset.csv", index=False)
    predict.to_csv(C.PROCESSED_DIR / "predict_dataset.csv", index=False)
    return train, predict
