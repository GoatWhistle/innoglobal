import numpy as np
import pandas as pd
import pytest

from pipetwin import curve, prepare
from pipetwin.train import (blend_prob, calibrate_level, conformal_halfwidths, dens_quant_cal,
                            pearson_r2, prior_blend, zscore)

rng = np.random.default_rng(0)


def test_zscore_of_constant_is_zero() -> None:
    assert np.all(zscore(np.full(5, 3.0)) == 0)


def test_pearson_r2_of_flat_forecast_is_zero() -> None:
    assert pearson_r2(rng.normal(size=10), np.ones(10)) == 0.0


def test_blend_keeps_level_and_spread_of_base() -> None:
    ens, p = rng.normal(6, 0.3, 200), rng.uniform(size=200)
    b = blend_prob(ens, p, w=2.0, gap=rng.normal(size=200), gap_w=0.5)
    assert np.mean(b) == pytest.approx(np.mean(ens))
    assert np.std(b) == pytest.approx(np.std(ens))


def test_prior_alone_shapes_constant_base() -> None:
    p = rng.normal(size=50)
    out = prior_blend(np.full(50, 6.0), p, w=0.5)
    assert np.corrcoef(out, -p)[0, 1] == pytest.approx(1.0)


def test_calibrate_level_hits_both_anchors() -> None:
    pred = rng.normal(size=100)
    out = calibrate_level(pred, wt_nom=4.5, age=29.0, rates=np.array([0.002, 0.004]))
    assert np.mean(out) == pytest.approx(4.5 - 0.003 * 29.0)
    assert np.max(out) == pytest.approx(4.5)
    assert np.corrcoef(out, pred)[0, 1] == pytest.approx(1.0)


def test_dens_quant_cal_level_scale_and_sign() -> None:
    n = 100
    ds = pd.DataFrame({c: rng.normal(5, 0.5, n) for c in ("prev_q02", "prev_q10", "prev_q10_nb3")})
    ds["prev_ndef_w5"] = rng.poisson(3, n).astype(float)
    ds["prev_min"] = ds["prev_q02"] - 0.1
    ens = rng.normal(6, 0.4, n)
    out = dens_quant_cal(ds, ens, scale=1.2)
    assert np.mean(out) == pytest.approx(np.mean(ens))
    assert np.std(out) == pytest.approx(1.2 * np.std(ens))
    assert np.corrcoef(out, ds["prev_ndef_w5"])[0, 1] < 0  # больше дефектов вокруг — тоньше


def test_conformal_halfwidths_cover_requested_share() -> None:
    resid = rng.normal(size=1000)
    hw = conformal_halfwidths(resid)
    assert np.mean(np.abs(resid) <= hw["p10_p90"]) >= 0.8
    assert np.mean(np.abs(resid) <= hw["p05_p95"]) >= 0.9
    assert hw["p05_p95"] >= hw["p10_p90"]


def test_pairs_cover_all_start_end_combinations() -> None:
    passport = pd.DataFrame({"id": [1], "date_in": [pd.Timestamp("2000-01-01")]})
    runs = pd.DataFrame({"id": [1, 1, 1],
                         "run_date": pd.to_datetime(["2014-01-01", "2018-01-01", "2022-01-01"]),
                         "is_training_eligible": [False, True, True]})
    pairs = prepare.build_pairs(runs, passport)
    assert sorted(map(tuple, pairs[["kind", "start", "end"]].astype(str).to_numpy())) == [
        ("comm2vtd", "2000-01-01", "2018-01-01"),
        ("comm2vtd", "2000-01-01", "2022-01-01"),
        ("vtd2vtd", "2018-01-01", "2022-01-01"),
    ]


def test_degradation_curve_never_grows() -> None:
    df = pd.DataFrame({"id": 1, "segment_id": np.arange(20), "wt_nom": 8.0,
                       "thickness_pred": rng.uniform(5, 8, 20), "prev_min": rng.uniform(5, 8, 20)})
    c = curve.degradation_curve(df, "2000-01-01", "2022-07-06", "2023-12-01")
    assert curve.check_monotone(c) == 0
