from typing import Annotated

from fastapi import Depends, Request

from app.usecase.catalog import ForecastCatalog
from app.usecase.pipes import PipeQueries
from app.usecase.reference import ReferenceQueries


def _catalog(request: Request) -> ForecastCatalog:
    catalog = request.app.state.catalog
    assert isinstance(catalog, ForecastCatalog)
    return catalog


def _pipes(catalog: Annotated[ForecastCatalog, Depends(_catalog)]) -> PipeQueries:
    return PipeQueries(catalog)


def _reference(catalog: Annotated[ForecastCatalog, Depends(_catalog)]) -> ReferenceQueries:
    return ReferenceQueries(catalog)


Catalog = Annotated[ForecastCatalog, Depends(_catalog)]
Pipes = Annotated[PipeQueries, Depends(_pipes)]
Reference = Annotated[ReferenceQueries, Depends(_reference)]
