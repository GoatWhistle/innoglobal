import pytest

from app.domain.pipeline import Forecast
from app.domain.priority import inspection_priorities, priority_count


@pytest.mark.parametrize(
    ("total", "expected"),
    [(0, 0), (1, 1), (9, 1), (10, 1), (11, 2), (525, 53), (1475, 148)],
)
def test_priority_count_rounds_up_ten_percent(total: int, expected: int) -> None:
    assert priority_count(total) == expected


def test_ranking_orders_by_thickness_then_segment_id() -> None:
    values = [5.0, 3.0, 4.0, 3.0, 6.0, 7.0, 8.0, 9.0, 9.5, 9.6, 9.7, 9.8]
    forecasts = tuple(Forecast(i, v, v, v, v, v) for i, v in enumerate(values))

    ranked = inspection_priorities(forecasts)

    assert [(item.rank, item.segment_id) for item in ranked] == [(1, 1), (2, 3)]
