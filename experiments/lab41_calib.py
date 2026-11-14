"""Лаборатория 41-42: калибровка выхода бленда кейса 1 в мм (уровень/масштаб/форма).

Работает на кэше lab40_cache (компоненты бленда на валидации и внутреннем CV).
Печатает средние по 8 сидам r²/MAE/RMSE/MAPE, число побед по MAE (8 и 3 сида).
Референс (ens_blend, 8 сидов): r² 0.618, MAE 0.279, RMSE 0.374, MAPE 4.90%.

ПРИНЯТО (lab41): med+sprev — форма z(бленда), уровень median(ens), масштаб
std(prev_min) прошлого пропуска этой трубы (правило без подбора): r² без изменений,
MAE 0.279 -> 0.267, RMSE 0.374 -> 0.356, MAPE 4.90 -> 4.66 (8/8 сидов, 3/3).
С физическим клиппингом по номиналу (как в predict.py) — MAE 0.254, RMSE 0.349,
MAPE 4.50, r² -0.004 (два чистых сегмента y=8.0 теряют рычаг) — это прод-путь.
ПРИНЯТО (lab42, баг прода, валидацией не ловился): predict.py сдвигал весь профиль
кейса 1 так, чтобы p99 лёг на номинал (правило кейса 2). У 1250022871 бездефектные
сегменты дают z бленда 5-6 -> p99 9.04 мм -> весь прогноз ниже на 1.04 мм (среднее
4.90 при прошлом пропуске 6.29, ~1 мм/год против 0.25 на валидации). Сдвиг оставлен
только кейсу 2; прогноз 22871 теперь 5.92 мм в среднем, 15 чистых сегментов = 8.0.

ОТВЕРГНУТО:
- калибровка с внутреннего CV по train-парам 2018->2022 (oof_affine_L1 r² 0.54 /
  MAE 0.368, oof_iso 0.53 / 0.331): модель на этих парах без навыка (r² 0.00-0.05,
  наклон ~0 или отрицательный) — перенос на 2022->2023 невозможен;
- кросс-фит по блокам валидации (affine/shift/iso): 0/8, r² −0.05..−0.43;
- квантильное отображение на распределение prev_min: r² 0.48, MAE 0.311;
- shrink к prev_min 0.2/0.4: r² 0.55/0.42; клиппинг ≤ prev_min (+0.3): r² 0.42/0.57
  (прошлый замер шумный, снаряд 2023 регрессирует к среднему — «не толще прошлого»
  по сегментному минимуму не физично);
- медиана членов ансамбля вместо среднего: r² −0.04;
- поправка на систематику снаряда 2023 (−4.6% стенки = −0.37 мм к уровню): MAE
  0.254 -> 0.381 на 3/3 сидах; медианная невязка калиброванного прогноза уже 0.000
  (база училась на парах с пропусками 2023 и уровень знает);
- фиксированные множители масштаба ×1.2..1.6 дают MAE 0.259-0.265, но это подбор
  на валидации — взято правило std(prev_min) (эквивалент ×1.6 на валидации,
  ×1.19 на прогнозе 22871).
"""
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.isotonic import IsotonicRegression

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from pipetwin import train as T  # noqa: E402

CACHE = joblib.load(Path(__file__).resolve().parent / "data" / "lab40_cache.joblib")
BW, GW = 2.0, 0.5


def metrics(y, p):
    return dict(r2=T.pearson_r2(y, p), mae=float(np.mean(np.abs(y - p))),
                rmse=float(np.sqrt(np.mean((y - p) ** 2))),
                mape=float(np.mean(np.abs(y - p) / y) * 100))


def blend_z(c, seed):
    ens = c["ensemble"]
    b = T.blend_prob(ens, c[f"p_{seed}"], BW, gap=ens - c["q05"], gap_w=GW)
    return T.zscore(b)


def l1_affine(z, r):
    """Медианная регрессия r ~ a + b·z (L1) — для MAE."""
    from sklearn.linear_model import QuantileRegressor
    q = QuantileRegressor(quantile=0.5, alpha=0.0, solver="highs").fit(z[:, None], r)
    return float(q.intercept_), float(q.coef_[0])


def oof_fit(seed, kind):
    """Калибровка, обученная на внутреннем CV train (пары 2018->2022)."""
    zs, rs, ys, bs = [], [], [], []
    for part in ("oof_A", "oof_B"):
        c = CACHE[part]
        s = seed if f"p_{seed}" in c else 42
        z = blend_z(c, s)
        ens = c["ensemble"]
        zs.append(z)
        rs.append(c["meta"]["y"].values - ens.mean())
        bs.append(z * ens.std() + ens.mean())
        ys.append(c["meta"]["y"].values)
    z, r = np.concatenate(zs), np.concatenate(rs)
    if kind == "affine":
        return l1_affine(z, r)
    iso = IsotonicRegression(out_of_bounds="clip").fit(z, r)
    return iso


def crossfit_val(z, y, ens, k=5, kind="affine"):
    """Кросс-фит на валидации блоками по позиции: точка калибруется по остальным
    блокам (аналог прода: калибровка на 2023-парах соседей -> 22871)."""
    n = len(y)
    blocks = np.array_split(np.arange(n), k)
    out = np.empty(n)
    r = y - ens.mean()
    for b in blocks:
        m = np.ones(n, bool)
        m[b] = False
        if kind == "affine":
            a, s = l1_affine(z[m], r[m])
            out[b] = ens.mean() + a + s * z[b]
        elif kind == "shift":
            out[b] = ens.mean() + np.median(r[m] - z[m] * ens.std()) + z[b] * ens.std()
        elif kind == "iso":
            iso = IsotonicRegression(out_of_bounds="clip").fit(z[m], r[m])
            out[b] = ens.mean() + iso.predict(z[b])
    return out


def qmap(z, ref):
    """Квантильное отображение рангов z на распределение ref."""
    ranks = (pd.Series(z).rank().values - 0.5) / len(z)
    return np.quantile(ref, ranks)


def variants(seed):
    c = CACHE["val"]
    m = c["meta"]
    y, ens, pm = m["y"].values, c["ensemble"], m["prev_min"].values
    z = blend_z(c, seed)
    mu, sd = ens.mean(), ens.std()
    ref = z * sd + mu
    v = {"ref": ref}
    # 2. масштаб z-членов (фиксированные множители, без подбора)
    for s in (0.8, 1.2, 1.4, 1.6):
        v[f"scale×{s}"] = z * sd * s + mu
    v["scale=std(prev_min)"] = z * pm.std() + mu
    # 3. уровень: медиана вместо среднего; медиана членов ансамбля
    v["level=median(ens)"] = z * sd + np.median(ens)
    mem = np.median(np.column_stack([c["lgbm"], c["xgb"], c["aft"]]), axis=1)
    bm = T.blend_prob(mem, c[f"p_{seed}"], BW, gap=mem - c["q05"], gap_w=GW)
    v["ens=median(members)"] = bm
    # 1. калибровка с внутреннего CV train
    a, s = oof_fit(seed, "affine")
    v["oof_affine_L1"] = mu + a + s * z
    v["oof_iso"] = mu + oof_fit(seed, "iso").predict(z)
    # 1'. кросс-фит по валидации (честный по точкам)
    v["xfit_affine_L1"] = crossfit_val(z, y, ens, kind="affine")
    v["xfit_shift"] = crossfit_val(z, y, ens, kind="shift")
    v["xfit_iso"] = crossfit_val(z, y, ens, kind="iso")
    # квантильное отображение на распределение прошлого пропуска (со сдвигом уровня ens)
    v["qmap_prev"] = qmap(z, pm) - pm.mean() + mu
    v["qmap_prev_med"] = qmap(z, pm) - np.median(pm) + np.median(ens)
    # shrink к prev_min
    for lam in (0.2, 0.4):
        v[f"shrink_prev{lam}"] = (1 - lam) * ref + lam * (pm - pm.mean() + mu)
    # 4. физика: не толще прошлого замера / номинала
    v["clip<=prev_min"] = np.minimum(ref, pm)
    v["clip<=prev_min+0.3"] = np.minimum(ref, pm + 0.3)
    wt = m["wt_nom"].values
    v["clip<=wt_nom"] = np.minimum(ref, wt)
    # комбинации принципиальных правил (без подбора на валидации)
    med = np.median(ens)
    v["med+sprev"] = z * pm.std() + med
    v["med+sprev+clip"] = np.minimum(z * pm.std() + med, wt)
    v["sprev+clip"] = np.minimum(z * pm.std() + mu, wt)
    # прод-путь до фикса: сдвиг p99 -> номинал (predict.py, правило кейса 2)
    for name in ("ref", "sprev+clip", "med+sprev+clip"):
        pp = v[name]
        v[name + "+p99shift"] = np.minimum(pp - max(0.0, np.quantile(pp, 0.99) - wt[0]), wt)
    return y, v


def main():
    seeds = [int(k[2:]) for k in CACHE["val"] if k.startswith("p_")]
    rows = []
    for s in seeds:
        y, v = variants(s)
        for name, p in v.items():
            rows.append(dict(variant=name, seed=s, **metrics(y, p)))
    df = pd.DataFrame(rows)
    ref = df[df.variant == "ref"].set_index("seed")
    df["d_mae"] = df.apply(lambda r: r.mae - ref.loc[r.seed, "mae"], axis=1)
    df["d_r2"] = df.apply(lambda r: r.r2 - ref.loc[r.seed, "r2"], axis=1)
    g = df.groupby("variant", sort=False).agg(
        r2=("r2", "mean"), mae=("mae", "mean"), rmse=("rmse", "mean"), mape=("mape", "mean"),
        mae_wins=("d_mae", lambda x: int((x < 0).sum())), r2_min_d=("d_r2", "min"))
    g3 = df[df.seed.isin([42, 7, 2024])].groupby("variant", sort=False).agg(
        mae3_wins=("d_mae", lambda x: int((x < 0).sum())))
    print(g.join(g3).round(4).to_string())


if __name__ == "__main__":
    main()
