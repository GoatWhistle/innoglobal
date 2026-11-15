from typing import Annotated

from fastapi import APIRouter, Path, Query
from fastapi.responses import Response

from app.controller.dependencies import Pipes, Reference
from app.controller.errors import ErrorResponse
from app.controller.pipes.schemas import (
    FeatureOut,
    PipeListOut,
    PipeOut,
    PrioritiesOut,
    ProfileOut,
    SegmentDetailOut,
    SegmentOut,
    SegmentPageOut,
)
from app.controller.tabular import priorities_csv
from app.domain.priority import PRIORITY_PERCENT
from app.usecase.views import SegmentQuery, SegmentSort

router = APIRouter(tags=["pipes"])

ERRORS: dict[int | str, dict[str, object]] = {
    404: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
    503: {"model": ErrorResponse},
}
PipeId = Annotated[int, Path(ge=1)]


@router.get("/pipes", response_model=PipeListOut, responses=ERRORS)
def list_pipes(pipes: Pipes, reference: Reference) -> PipeListOut:
    items = [PipeOut.of(item, PRIORITY_PERCENT) for item in pipes.list_pipes()]
    return PipeListOut(snapshot_id=reference.snapshot_id(), items=items)


@router.get("/pipes/{pipe_id}", response_model=PipeOut, responses=ERRORS)
def get_pipe(pipe_id: PipeId, pipes: Pipes) -> PipeOut:
    return PipeOut.of(pipes.pipe(pipe_id), PRIORITY_PERCENT)


@router.get("/pipes/{pipe_id}/profile", response_model=ProfileOut, responses=ERRORS)
def get_profile(pipe_id: PipeId, pipes: Pipes, reference: Reference) -> ProfileOut:
    summary = pipes.pipe(pipe_id)
    rows = pipes.profile(pipe_id)
    dates = sorted({item.run_date for row in rows for item in row.observations})
    return ProfileOut(
        snapshot_id=reference.snapshot_id(),
        pipe_id=pipe_id,
        nominal_wall_mm=summary.passport.nominal_wall_mm,
        run_dates=dates,
        rows=[SegmentOut.of(row) for row in rows],
    )


@router.get("/pipes/{pipe_id}/segments", response_model=SegmentPageOut, responses=ERRORS)
def list_segments(
    pipe_id: PipeId,
    pipes: Pipes,
    reference: Reference,
    from_m: Annotated[float | None, Query(ge=0)] = None,
    to_m: Annotated[float | None, Query(ge=0)] = None,
    priority_only: bool = False,
    sort: SegmentSort = SegmentSort.SEGMENT,
    descending: bool = False,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> SegmentPageOut:
    query = SegmentQuery(from_m, to_m, priority_only, sort, descending, offset, limit)
    page = pipes.segments(pipe_id, query)
    return SegmentPageOut(
        snapshot_id=reference.snapshot_id(),
        total=page.total,
        offset=page.offset,
        limit=page.limit,
        items=[SegmentOut.of(row) for row in page.items],
    )


@router.get(
    "/pipes/{pipe_id}/segments/{segment_id}", response_model=SegmentDetailOut, responses=ERRORS
)
def get_segment(
    pipe_id: PipeId,
    segment_id: Annotated[int, Path(ge=0)],
    pipes: Pipes,
    reference: Reference,
) -> SegmentDetailOut:
    detail = pipes.segment(pipe_id, segment_id)
    return SegmentDetailOut(
        snapshot_id=reference.snapshot_id(),
        pipe_id=pipe_id,
        case_id=pipes.pipe(pipe_id).case.case_id,
        nominal_wall_mm=detail.nominal_wall_mm,
        segment=SegmentOut.of(detail.row),
        features=[
            FeatureOut(name=f.name, value=f.value, pipe_median=f.pipe_median, share=f.share)
            for f in detail.features
        ],
        previous_id=detail.previous_id,
        next_id=detail.next_id,
    )


@router.get("/pipes/{pipe_id}/priorities", response_model=PrioritiesOut, responses=ERRORS)
def get_priorities(pipe_id: PipeId, pipes: Pipes, reference: Reference) -> PrioritiesOut:
    rows = pipes.priorities(pipe_id)
    return PrioritiesOut(
        snapshot_id=reference.snapshot_id(),
        pipe_id=pipe_id,
        percent=PRIORITY_PERCENT,
        total_segments=pipes.pipe(pipe_id).segments,
        items=[SegmentOut.of(row) for row in rows],
    )


@router.get(
    "/pipes/{pipe_id}/priorities.csv",
    response_class=Response,
    responses={200: {"content": {"text/csv": {}}}, **ERRORS},
)
def export_priorities(pipe_id: PipeId, pipes: Pipes) -> Response:
    body = priorities_csv(pipe_id, pipes.priorities(pipe_id))
    name = f"duppel-priorities-{pipe_id}.csv"
    return Response(
        content=body,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{name}"'},
    )
