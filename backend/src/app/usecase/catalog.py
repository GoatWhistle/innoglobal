from dataclasses import dataclass

from app.domain.errors import DataUnavailable, PipeNotFound
from app.domain.pipeline import TargetPipe
from app.domain.snapshot import Snapshot, snapshot_issues
from app.usecase.interface import Logger, SnapshotSource


@dataclass(frozen=True, slots=True)
class Readiness:
    ready: bool
    snapshot_id: str | None
    issues: tuple[str, ...]


class ForecastCatalog:
    def __init__(self, source: SnapshotSource, logger: Logger) -> None:
        self._source = source
        self._logger = logger
        self._snapshot: Snapshot | None = None
        self._issues: tuple[str, ...] = ("snapshot not loaded",)

    def refresh(self) -> Readiness:
        try:
            snapshot = self._source.load()
        except DataUnavailable as exc:
            self._fail(exc.issues or (exc.message,))
            return self.readiness()
        issues = snapshot_issues(snapshot)
        if issues:
            self._fail(issues)
        else:
            self._snapshot, self._issues = snapshot, ()
            self._logger.info("snapshot_loaded", snapshot_id=snapshot.snapshot_id)
        return self.readiness()

    def _fail(self, issues: tuple[str, ...]) -> None:
        self._snapshot, self._issues = None, issues
        self._logger.error("snapshot_rejected", issues=len(issues), first=issues[0])

    def readiness(self) -> Readiness:
        snapshot_id = self._snapshot.snapshot_id if self._snapshot else None
        return Readiness(self._snapshot is not None, snapshot_id, self._issues)

    def snapshot(self) -> Snapshot:
        if self._snapshot is None:
            raise DataUnavailable(self._issues)
        return self._snapshot

    def target(self, pipe_id: int) -> TargetPipe:
        for target in self.snapshot().targets:
            if target.case.pipe_id == pipe_id:
                return target
        raise PipeNotFound()
