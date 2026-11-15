import hashlib
from dataclasses import dataclass
from pathlib import Path

import duckdb
from app.domain.cases import TARGET_CASES
from app.domain.errors import DataUnavailable
from app.domain.pipeline import ResultRow, TargetPipe
from app.domain.snapshot import Snapshot
from app.repository.duckdb.comparisons import load_comparisons
from app.repository.duckdb.reference import load_network, load_quality, load_validation
from app.repository.duckdb.targets import load_runs, load_target


@dataclass(frozen=True, slots=True)
class DataPaths:
    warehouse: Path
    result: Path
    uncertainty: Path
    features: Path
    training: Path
    charts: Path
    validation: Path
    importance: dict[str, Path]

    @classmethod
    def under(cls, root: Path) -> "DataPaths":
        artifacts = root / "artifacts"
        return cls(
            warehouse=root / "warehouse" / "pipetwin.duckdb",
            result=root / "result.csv",
            uncertainty=artifacts / "uncertainty.csv",
            charts=root / "chart_data.json",
            training=root / "data" / "processed" / "train_dataset.csv",
            features=root / "data" / "processed" / "predict_dataset.csv",
            validation=artifacts / "validation_report.csv",
            importance={
                case.case_id: artifacts / f"feature_importance_{case.case_id}.csv"
                for case in TARGET_CASES
            },
        )

    def files(self) -> tuple[Path, ...]:
        fixed = (
            self.warehouse,
            self.result,
            self.uncertainty,
            self.features,
            self.validation,
            self.training,
            self.charts,
        )
        return (*fixed, *self.importance.values())


def _fingerprint(paths: DataPaths) -> str:
    digest = hashlib.sha256()
    for path in paths.files():
        digest.update(path.name.encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()[:12]


def _result(con: duckdb.DuckDBPyConnection, path: Path) -> tuple[ResultRow, ...]:
    rows = con.execute(
        "select id, segment_id, thickness_pred from read_csv($path, header = true) "
        "order by id, segment_id",
        {"path": str(path)},
    ).fetchall()
    return tuple(ResultRow(int(r[0]), int(r[1]), float(r[2])) for r in rows)


class DuckdbSnapshotSource:
    def __init__(self, paths: DataPaths) -> None:
        self._paths = paths

    def load(self) -> Snapshot:
        missing = tuple(
            f"missing file {path}" for path in self._paths.files() if not path.is_file()
        )
        if missing:
            raise DataUnavailable(missing)
        try:
            con = duckdb.connect(str(self._paths.warehouse), read_only=True)
        except duckdb.Error as exc:
            raise DataUnavailable((f"warehouse cannot be opened: {type(exc).__name__}",)) from exc
        try:
            return self._read(con)
        except duckdb.Error as exc:
            raise DataUnavailable((f"warehouse query failed: {exc}",)) from exc
        finally:
            con.close()

    def _read(self, con: duckdb.DuckDBPyConnection) -> Snapshot:
        runs = load_runs(con)
        targets: list[TargetPipe] = []
        issues: list[str] = []
        for case in TARGET_CASES:
            loaded = load_target(con, case, runs, self._paths.uncertainty, self._paths.features)
            if isinstance(loaded, str):
                issues.append(loaded)
            else:
                targets.append(loaded)
        if issues:
            raise DataUnavailable(tuple(issues))
        return Snapshot(
            snapshot_id=_fingerprint(self._paths),
            targets=tuple(targets),
            network=load_network(con),
            quality=load_quality(con, tuple(case.pipe_id for case in TARGET_CASES), runs),
            validation=load_validation(
                con,
                self._paths.validation,
                self._paths.importance,
                load_comparisons(self._paths.charts, self._paths.training),
            ),
            result=_result(con, self._paths.result),
        )
