import csv
import io

from app.domain.pipeline import ResultRow
from app.usecase.views import SegmentRow

RESULT_HEADER = ("id", "segment_id", "thickness_pred")
PRIORITY_HEADER = (
    "rank",
    "id",
    "segment_id",
    "start_m",
    "end_m",
    "thickness_pred",
    "p10",
    "p90",
)


def _number(value: float) -> str:
    return repr(round(value, 3))


def result_csv(rows: tuple[ResultRow, ...]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(RESULT_HEADER)
    for row in rows:
        writer.writerow((row.pipe_id, row.segment_id, _number(row.thickness_mm)))
    return buffer.getvalue()


def priorities_csv(pipe_id: int, rows: tuple[SegmentRow, ...]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(PRIORITY_HEADER)
    for row in rows:
        writer.writerow(
            (
                row.priority_rank,
                pipe_id,
                row.segment.segment_id,
                _number(row.segment.start_m),
                _number(row.segment.end_m),
                _number(row.forecast.thickness_mm),
                _number(row.forecast.p10_mm),
                _number(row.forecast.p90_mm),
            )
        )
    return buffer.getvalue()
