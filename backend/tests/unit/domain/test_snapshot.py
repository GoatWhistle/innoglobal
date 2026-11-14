from collections.abc import Callable
from dataclasses import replace

from app.domain.pipeline import Forecast, TargetPipe
from app.domain.snapshot import Snapshot, decimate, snapshot_issues

WithTarget = Callable[[Snapshot, int, TargetPipe], Snapshot]


def test_consistent_snapshot_has_no_issues(snapshot: Snapshot) -> None:
    assert snapshot_issues(snapshot) == ()


def test_missing_and_duplicate_forecasts_are_reported(
    snapshot: Snapshot, with_target: WithTarget
) -> None:
    first = snapshot.targets[0]
    forecasts = (*first.forecasts[:-1], first.forecasts[0])
    broken = with_target(snapshot, 0, replace(first, forecasts=forecasts))

    issues = snapshot_issues(broken)

    assert any("duplicate forecast for segment 0" in issue for issue in issues)
    assert any("1 segments without forecast" in issue for issue in issues)


def test_out_of_order_quantiles_and_bounds_are_reported(
    snapshot: Snapshot, with_target: WithTarget
) -> None:
    first = snapshot.targets[0]
    bad = Forecast(0, 9.0, 9.5, 9.0, 9.0, 9.0)
    broken = with_target(snapshot, 0, replace(first, forecasts=(bad, *first.forecasts[1:])))

    issues = snapshot_issues(broken)

    assert any("quantiles out of order" in issue for issue in issues)
    assert any("outside (0, nominal]" in issue for issue in issues)


def test_result_rows_must_match_forecast(snapshot: Snapshot) -> None:
    row = replace(snapshot.result[0], thickness_mm=snapshot.result[0].thickness_mm + 0.1)
    broken = replace(snapshot, result=(row, *snapshot.result[1:]))

    assert any("differs from forecast" in issue for issue in snapshot_issues(broken))


def test_decimate_keeps_ends_and_spacing() -> None:
    points = tuple((float(d), 0.0, 0.0) for d in range(0, 101, 5))

    kept = decimate(points, 20.0)

    assert [p[0] for p in kept] == [0.0, 20.0, 40.0, 60.0, 80.0, 100.0]


def test_non_finite_result_is_rejected(snapshot: Snapshot) -> None:
    row = replace(snapshot.result[0], thickness_mm=float("nan"))
    broken = replace(snapshot, result=(row, *snapshot.result[1:]))

    assert any("non-finite result" in issue for issue in snapshot_issues(broken))
