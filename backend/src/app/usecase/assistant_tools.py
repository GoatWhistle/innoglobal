from dataclasses import asdict
from statistics import median

from app.domain.assistant import AssistantContext
from app.domain.errors import DataUnavailable, InvalidQuestion
from app.domain.inference import JsonSchema
from app.domain.priority import inspection_priorities
from app.usecase.catalog import ForecastCatalog
from app.usecase.interface import ExplanationSource
from app.usecase.pipes import PipeQueries

TOOL_NAMES = ("segment", "explanation", "neighbors", "priorities", "range_summary", "validation")


class AssistantTools:
    def __init__(self, catalog: ForecastCatalog, explanations: ExplanationSource) -> None:
        self._catalog = catalog
        self._explanations = explanations
        self._pipes = PipeQueries(catalog)

    def current_context(self, pipe_id: int) -> AssistantContext:
        target = self._catalog.target(pipe_id)
        return AssistantContext(
            pipe_id, 0, self._catalog.snapshot().snapshot_id, target.case.target_date
        )

    def validate(self, context: AssistantContext) -> None:
        target = self._catalog.target(context.pipe_id)
        self._pipes.segment(context.pipe_id, context.segment_id)
        if (
            context.snapshot_id != self._catalog.snapshot().snapshot_id
            or context.target_date != target.case.target_date
            or context.scope not in ("segment", "pipe")
            or (context.from_m is not None and context.from_m < 0)
            or (context.to_m is not None and context.to_m > target.passport.length_m)
            or (
                context.from_m is not None
                and context.to_m is not None
                and context.from_m >= context.to_m
            )
            or (
                context.comparison_date is not None
                and context.comparison_date not in {r.run_date for r in target.runs}
            )
        ):
            raise InvalidQuestion("Assistant context does not match the current snapshot")

    def call(self, name: str, segment_id: int, context: AssistantContext) -> JsonSchema:
        self.validate(context)
        detail = self._pipes.segment(context.pipe_id, segment_id)
        target = self._catalog.target(context.pipe_id)
        if name == "segment":
            row = detail.row
            return {
                "segment_id": segment_id,
                "start_m": row.segment.start_m,
                "end_m": row.segment.end_m,
                "forecast_mm": row.forecast.thickness_mm,
                "p10_mm": row.forecast.p10_mm,
                "p90_mm": row.forecast.p90_mm,
                "observations": [asdict(item) for item in row.observations],
                "nominal_mm": detail.nominal_wall_mm,
            }
        if name == "explanation":
            card = self._explanations.card(context.pipe_id, segment_id)
            try:
                valid = (
                    card["id"] == context.pipe_id
                    and card["segment_id"] == segment_id
                    and card["forecast"]["date"] == context.target_date.isoformat()
                    and abs(card["forecast"]["thickness_mm"] - detail.row.forecast.thickness_mm)
                    <= 0.0006
                    and card["forecast"]["wt_nom_mm"] == detail.nominal_wall_mm
                )
                if not valid:
                    raise ValueError("stale explanation")
                return {key: card[key] for key in ("model", "observation", "hypotheses", "missing")}
            except (KeyError, TypeError, ValueError) as exc:
                raise DataUnavailable(("explanation does not match snapshot",)) from exc
        if name == "neighbors":
            return {
                "items": [
                    self.call("segment", i, context)
                    for i in range(
                        max(0, segment_id - 2), min(len(target.segments), segment_id + 3)
                    )
                ]
            }
        if name == "priorities":
            ordered = sorted(target.forecasts, key=lambda f: (f.thickness_mm, f.segment_id))
            chosen = inspection_priorities(target.forecasts)
            rank = next(i + 1 for i, item in enumerate(ordered) if item.segment_id == segment_id)
            return {
                "rule": "ceil(10% N), ascending forecast_mm then segment_id; not failure probability",
                "rank": rank,
                "total": len(ordered),
                "selected": len(chosen),
                "in_top": rank <= len(chosen),
                "equal_forecasts": sum(
                    f.thickness_mm == detail.row.forecast.thickness_mm for f in ordered
                ),
                "median_mm": median(f.thickness_mm for f in ordered),
                "items": [asdict(item) for item in chosen[:5]],
            }
        if name == "range_summary":
            start = context.from_m if context.from_m is not None else 0
            end = context.to_m if context.to_m is not None else target.passport.length_m
            ids = {s.segment_id for s in target.segments if s.end_m > start and s.start_m < end}
            selected = sorted(
                (f for f in target.forecasts if f.segment_id in ids),
                key=lambda f: (f.thickness_mm, f.segment_id),
            )
            if not selected:
                raise InvalidQuestion("No segments in the selected range")
            return {
                "from_m": start,
                "to_m": end,
                "count": len(selected),
                "min_mm": selected[0].thickness_mm,
                "max_mm": selected[-1].thickness_mm,
                "median_mm": median(f.thickness_mm for f in selected),
                "thinnest_segment_ids": [f.segment_id for f in selected[:5]],
                "segments_with_observations": len(
                    {o.segment_id for o in target.observations if o.segment_id in ids}
                ),
            }
        if name == "validation":
            report = self._catalog.snapshot().validation
            metrics = sorted(
                (m for m in report.metrics if m.case_id == target.case.case_id),
                key=lambda m: m.model != target.case.predictor,
            )
            return {
                "selected_predictor": target.case.predictor,
                "metrics": [asdict(m) for m in metrics[:8]],
                "historical_pairs": [
                    asdict(p) for p in report.pairs if p.case_id == target.case.case_id
                ],
                "separate_archived_comparisons": [
                    {
                        "status": c.status,
                        "source": c.source,
                        "source_samples": c.source_samples,
                        "pearson_r2": c.pearson_r2,
                        "mae_mm": c.mae_mm,
                    }
                    for c in report.comparisons
                    if c.case_id == target.case.case_id
                ],
                "limits": [
                    "Target inspection is withheld: target accuracy is unknown.",
                    "Feature contributions describe the predictor, not physical causation.",
                    "Quantile outputs alone do not establish calibrated coverage.",
                    "Inspection priority is not failure probability or a repair instruction.",
                ],
            }
        raise InvalidQuestion("Unknown assistant tool")
