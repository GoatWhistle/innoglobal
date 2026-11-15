from fastapi import APIRouter
from fastapi.responses import JSONResponse, Response

from app.controller.dependencies import Catalog, Reference
from app.controller.errors import ErrorResponse
from app.controller.pipes.schemas import RunOut
from app.controller.reference.schemas import (
    CaseOut,
    CheckOut,
    ComparisonOut,
    ImportanceOut,
    MetricOut,
    ModelOut,
    NetworkOut,
    PairOut,
    QualityOut,
    QuarantineOut,
    ReadyOut,
    RegimeOut,
    RouteOut,
    TableOut,
)
from app.controller.tabular import result_csv
from app.domain.cases import TARGET_CASES, is_baseline

router = APIRouter(tags=["reference"])
UNAVAILABLE: dict[int | str, dict[str, object]] = {503: {"model": ErrorResponse}}
CASE_BY_PIPE = {case.pipe_id: case.case_id for case in TARGET_CASES}
SELECTED = {case.case_id: case.predictor for case in TARGET_CASES}


@router.get("/ready", response_model=ReadyOut, responses={503: {"model": ReadyOut}})
def ready(catalog: Catalog) -> JSONResponse:
    state = catalog.readiness()
    body = ReadyOut(ready=state.ready, snapshot_id=state.snapshot_id, issues=list(state.issues))
    return JSONResponse(status_code=200 if state.ready else 503, content=body.model_dump())


@router.get("/network", response_model=NetworkOut, responses=UNAVAILABLE)
def network(reference: Reference) -> NetworkOut:
    lines = [
        RouteOut(
            pipe_id=line.pipe_id,
            direction=line.direction,
            section_name=line.section_name,
            nominal_wall_mm=line.nominal_wall_mm,
            length_m=line.length_m,
            case_id=CASE_BY_PIPE.get(line.pipe_id),
            points=list(line.points),
        )
        for line in reference.network()
    ]
    return NetworkOut(snapshot_id=reference.snapshot_id(), lines=lines)


@router.get("/data-quality", response_model=QualityOut, responses=UNAVAILABLE)
def data_quality(reference: Reference) -> QualityOut:
    report = reference.quality()
    return QualityOut(
        snapshot_id=reference.snapshot_id(),
        checked_at=report.checked_at,
        checks=[CheckOut.model_validate(item, from_attributes=True) for item in report.checks],
        quarantine=[
            QuarantineOut.model_validate(item, from_attributes=True) for item in report.quarantine
        ],
        tables=[TableOut.model_validate(item, from_attributes=True) for item in report.tables],
        regime=[RegimeOut.model_validate(item, from_attributes=True) for item in report.regime],
        runs=[RunOut.of(run) for run in report.runs],
    )


@router.get("/model/validation", response_model=ModelOut, responses=UNAVAILABLE)
def model_validation(reference: Reference) -> ModelOut:
    card = reference.model()
    return ModelOut(
        snapshot_id=reference.snapshot_id(),
        cases=[
            CaseOut(
                case_id=case.case_id,
                pipe_id=case.pipe_id,
                target_date=case.target_date,
                mode=case.mode.value,
                predictor=case.predictor,
            )
            for case in card.cases
        ],
        metrics=[
            MetricOut(
                case_id=item.case_id,
                model=item.model,
                segments=item.segments,
                pearson_r2=item.pearson_r2,
                mae_mm=item.mae_mm,
                is_baseline=is_baseline(item.model),
                is_selected=SELECTED.get(item.case_id) == item.model,
            )
            for item in card.report.metrics
        ],
        importance=[
            ImportanceOut.model_validate(item, from_attributes=True)
            for item in card.report.importance
        ],
        pairs=[
            PairOut(case_id=p.case_id, pipe_ids=list(p.pipe_ids), start=p.start, end=p.end)
            for p in card.report.pairs
        ],
        comparisons=[
            ComparisonOut.model_validate(item, from_attributes=True)
            for item in card.report.comparisons
        ],
        quantiles=["p05", "p10", "p90", "p95"],
    )


@router.get(
    "/exports/result.csv",
    response_class=Response,
    responses={200: {"content": {"text/csv": {}}}, **UNAVAILABLE},
)
def export_result(reference: Reference) -> Response:
    export = reference.result()
    return Response(
        content=result_csv(export.rows),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="result.csv"',
            "X-Snapshot-Id": export.snapshot_id,
        },
    )
