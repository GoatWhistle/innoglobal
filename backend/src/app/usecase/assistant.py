from dataclasses import dataclass
from datetime import date

from app.domain.errors import InvalidQuestion
from app.usecase.catalog import ForecastCatalog
from app.usecase.pipes import PipeQueries


@dataclass(frozen=True, slots=True)
class AssistantRequest:
    prompt: str
    pipe_id: int
    segment_id: int
    snapshot_id: str
    target_date: date
    comparison_date: date | None = None
    scope: str = "segment"


@dataclass(frozen=True, slots=True)
class AssistantReply:
    text: str
    actions: tuple[dict[str, object], ...]
    values: tuple[dict[str, object], ...]


def _mm(value: float) -> str:
    return f"{value:.2f}".replace(".", ",")


class EngineeringAssistant:
    def __init__(self, catalog: ForecastCatalog) -> None:
        self._catalog = catalog

    def answer(self, request: AssistantRequest) -> AssistantReply:
        snapshot = self._catalog.snapshot()
        target = self._catalog.target(request.pipe_id)
        if request.snapshot_id != snapshot.snapshot_id:
            raise InvalidQuestion("Snapshot has changed; reload the pipeline")
        if request.target_date != target.case.target_date or not request.prompt.strip():
            raise InvalidQuestion()
        pipes = PipeQueries(self._catalog)
        detail = pipes.segment(request.pipe_id, request.segment_id)
        row = detail.row
        prompt = request.prompt.casefold()
        actions: list[dict[str, object]] = []
        selected = [row]
        if any(word in prompt for word in ("сосед", "рядом", "neighbor")):
            selected = [
                item
                for item in pipes.profile(request.pipe_id)
                if abs(item.segment.segment_id - request.segment_id) <= 1
            ]
            text = "Соседние участки:\n" + "\n".join(
                f"{item.segment.start_m:g}–{item.segment.end_m:g} м — "
                f"{_mm(item.forecast.thickness_mm)} мм"
                for item in selected
            )
            actions.append(
                {
                    "kind": "range",
                    "from_m": selected[0].segment.start_m,
                    "to_m": selected[-1].segment.end_m,
                }
            )
        elif any(word in prompt for word in ("сравн", "втд", "compare")):
            observations = [
                item
                for item in row.observations
                if request.comparison_date is None or item.run_date == request.comparison_date
            ]
            last = observations[-1] if observations else None
            if last:
                delta = row.forecast.thickness_mm - last.residual_mm
                text = (
                    f"ВТД {last.run_date:%d.%m.%Y}: {_mm(last.residual_mm)} мм. "
                    f"Прогноз на {request.target_date:%d.%m.%Y}: "
                    f"{_mm(row.forecast.thickness_mm)} мм. "
                    f"Разница: {_mm(delta)} мм. Это сравнение измерения с прогнозом, "
                    "а не подтверждённая скорость коррозии."
                )
                actions.append({"kind": "compare", "date": last.run_date.isoformat()})
            else:
                text = "Для этого участка нет измерения ВТД на выбранную дату."
        elif request.scope == "pipe" or any(
            word in prompt for word in ("приоритет", "очеред", "priority")
        ):
            summary = pipes.pipe(request.pipe_id)
            text = (
                f"В очереди {summary.priority_count} из {summary.segments} участков: "
                "10% с наименьшей прогнозной толщиной стенки. "
                f"Граница очереди — {_mm(summary.priority_cutoff_mm)} мм. "
            )
            text += (
                f"Участок {request.segment_id} занимает место {row.priority_rank}. "
                if row.priority_rank
                else f"Участок {request.segment_id} вне очереди. "
            )
            text += "Приоритет проверки не означает аварию или подтверждённую утечку."
            actions.append(
                {
                    "kind": "priorities",
                    "segment_ids": [
                        item.segment.segment_id for item in pipes.priorities(request.pipe_id)
                    ],
                }
            )
        else:
            text = (
                f"Участок {request.segment_id}, {row.segment.start_m:g}–{row.segment.end_m:g} м. "
                f"Прогноз минимальной стенки: {_mm(row.forecast.thickness_mm)} мм; "
                f"номинал: {_mm(detail.nominal_wall_mm)} мм. "
                f"P10–P90: {_mm(row.forecast.p10_mm)}–{_mm(row.forecast.p90_mm)} мм. "
                "Покрытие интервала ещё не откалибровано.\n"
                "Доступен расчёт по данным: приоритет, сравнение с ВТД и соседние участки. "
                "Свободный анализ языковой моделью не подключён."
            )
            actions.append({"kind": "source", "source": "segment"})
        values = tuple(
            {
                "pipe_id": request.pipe_id,
                "segment_id": item.segment.segment_id,
                "forecast_mm": item.forecast.thickness_mm,
                "start_m": item.segment.start_m,
                "end_m": item.segment.end_m,
                "snapshot_id": snapshot.snapshot_id,
                "target_date": request.target_date.isoformat(),
            }
            for item in selected
        )
        return AssistantReply(
            text, tuple({"segment_ids": [], **action} for action in actions), values
        )
