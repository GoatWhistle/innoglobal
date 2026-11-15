import json
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path

from app.domain.errors import InvalidQuestion
from app.domain.inference import JsonSchema


class ResearchStore:
    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        with sqlite3.connect(path) as con:
            con.execute(
                "create table if not exists artifacts (id text primary key, body text not null)"
            )

    def put(self, body: JsonSchema) -> JsonSchema:
        record = {
            **body,
            "artifact_id": uuid.uuid4().hex,
            "created_at": datetime.now(UTC).isoformat(),
        }
        with sqlite3.connect(self.path) as con:
            con.execute("begin immediate")
            if record.get("kind") == "dashboard":
                family = record.get("dashboard_id", record["artifact_id"])
                versions = [json.loads(r[0]) for r in con.execute("select body from artifacts")]
                latest = max(
                    (
                        r.get("version", 1)
                        for r in versions
                        if r.get("kind") == "dashboard"
                        and r.get("dashboard_id", r["artifact_id"]) == family
                    ),
                    default=0,
                )
                record.update(dashboard_id=family, version=latest + 1)
            con.execute(
                "insert into artifacts values (?, ?)",
                (record["artifact_id"], json.dumps(record, default=str, allow_nan=False)),
            )
        return record

    def artifact(self, artifact_id: str) -> JsonSchema:
        with sqlite3.connect(self.path) as con:
            row = con.execute("select body from artifacts where id = ?", (artifact_id,)).fetchone()
        if row is None:
            raise InvalidQuestion("Unknown artifact")
        result: JsonSchema = json.loads(row[0])
        return result

    def dashboards(self) -> list[JsonSchema]:
        with sqlite3.connect(self.path) as con:
            records = [json.loads(row[0]) for row in con.execute("select body from artifacts")]
        latest: dict[str, JsonSchema] = {}
        for record in records:
            if record.get("kind") != "dashboard":
                continue
            family = record.get("dashboard_id", record["artifact_id"])
            if family not in latest or record["version"] > latest[family]["version"]:
                latest[family] = record
        return list(latest.values())

    def versions(self, artifact_id: str) -> list[JsonSchema]:
        current = self.artifact(artifact_id)
        family = current.get("dashboard_id", artifact_id)
        with sqlite3.connect(self.path) as con:
            records = [
                json.loads(row[0])
                for row in con.execute(
                    "select body from artifacts where json_extract(body, '$.kind') = 'dashboard'"
                )
            ]
        return sorted(
            [r for r in records if r.get("dashboard_id", r["artifact_id"]) == family],
            key=lambda r: r["version"],
            reverse=True,
        )
