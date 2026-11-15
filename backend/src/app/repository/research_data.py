import csv
import json
from dataclasses import asdict
from datetime import date
from pathlib import Path
from statistics import mean

from app.domain.assistant import AssistantContext
from app.domain.errors import InvalidQuestion
from app.domain.inference import JsonSchema
from app.repository.research_methods import MethodologyIndex
from app.repository.research_metrics import catalog, compare, statistics
from app.repository.research_sql import query
from app.repository.research_store import ResearchStore
from app.usecase.assistant_tools import AssistantTools

NAMES = (
    "data_catalog",
    "pipe_state",
    "search_methodology",
    "explain_corrosion",
    "query_data",
    "render_chart",
    "forecast_state",
    "compare_pipes",
    "compose_dashboard",
)


class ResearchDataSource:
    def __init__(self, root: Path, store: ResearchStore, tools: AssistantTools) -> None:
        self.root, self.store, self.tools = root, store, tools
        self.methods = MethodologyIndex(store.path, root / "docs/methodology/corpus.json")

    def artifact(self, artifact_id: str) -> JsonSchema:
        return self.store.artifact(artifact_id)

    def dashboards(self) -> list[JsonSchema]:
        return self.store.dashboards()

    def versions(self, artifact_id: str) -> list[JsonSchema]:
        return self.store.versions(artifact_id)

    def refresh(self, artifact_id: str) -> JsonSchema:
        original = self.artifact(artifact_id)
        if original.get("kind") != "dashboard":
            raise InvalidQuestion("Only dashboards can be refreshed")
        pipe_id = int(original["pipe_id"])
        context = self.tools.current_context(pipe_id)
        memo: dict[str, str] = {}

        def rebuild(ref: str) -> str:
            if ref in memo:
                return memo[ref]
            old = self.artifact(ref)
            recipe = old.get("recipe")
            if not recipe:
                raise InvalidQuestion("This artifact has no reproducible recipe")
            arguments = dict(recipe["arguments"])
            if old["kind"] == "dashboard":
                refs = [rebuild(child) for child in old["artifact_ids"]]
                result = self.store.put(
                    {
                        **old,
                        "artifact_ids": refs,
                        "dashboard_id": old.get("dashboard_id", old["artifact_id"]),
                        "previous_artifact_id": old["artifact_id"],
                        "snapshot_id": context.snapshot_id,
                        "context": asdict(context),
                        "recipe": {
                            "tool": "compose_dashboard",
                            "arguments": {"title": old["title"], "artifact_ids": refs},
                        },
                    }
                )
            else:
                if old["kind"] == "chart":
                    arguments["data_ref"] = rebuild(old["data_ref"])
                result = self.execute(recipe["tool"], arguments, context)
            memo[ref] = str(result["artifact_id"])
            return memo[ref]

        return self.artifact(rebuild(artifact_id))

    def execute(self, name: str, arguments: JsonSchema, context: AssistantContext) -> JsonSchema:
        if name not in NAMES:
            raise InvalidQuestion("Unknown research tool")
        self.tools.validate(context)
        cutoff = context.target_date.isoformat()
        scope = {
            "snapshot_id": context.snapshot_id,
            "cutoff_date": cutoff,
            "pipe_id": context.pipe_id,
            "context": asdict(context),
            "recipe": {"tool": name, "arguments": arguments},
        }
        if name == "data_catalog":
            data = query(
                self.root, "select pipe_id, direction, wt_nom_mm from analytics.pipes", cutoff
            )
            return {
                "pipes": data["rows"],
                "cutoff_date": cutoff,
                **catalog(self.root, arguments.get("table")),
            }
        if name in ("pipe_state", "explain_corrosion"):
            tool = "range_summary" if name == "pipe_state" else "explanation"
            return self.tools.call(
                tool, int(arguments.get("segment_id", context.segment_id)), context
            )
        if name == "query_data":
            data = query(self.root, str(arguments["sql"]), cutoff)
            serialized = json.dumps(data, default=str)
            if len(serialized.encode()) > 10_000_000:
                raise InvalidQuestion("Query result exceeds artifact size budget")
            artifact = self.store.put({"kind": "table", **scope, **data})
            return {
                "artifact_id": artifact["artifact_id"],
                "columns": data["columns"],
                "row_count": data["row_count"],
                "sample": data["rows"][:5],
                "statistics": statistics(data["rows"], data["columns"]),
            }
        if name == "render_chart":
            source = self.artifact(str(arguments["data_ref"]))
            if source.get("snapshot_id") != context.snapshot_id:
                raise InvalidQuestion("Artifact snapshot mismatch")
            kind = arguments.get("kind", "line")
            if kind not in ("line", "bar", "scatter"):
                raise InvalidQuestion("Unsupported chart")
            x, y = str(arguments["x"]), str(arguments["y"])
            if x not in source["columns"] or y not in source["columns"]:
                raise InvalidQuestion("Unknown chart columns")
            artifact = self.store.put(
                {
                    "kind": "chart",
                    **scope,
                    "data_ref": source["artifact_id"],
                    "chart_kind": kind,
                    "x": x,
                    "y": y,
                }
            )
            return {
                "artifact_id": artifact["artifact_id"],
                "kind": kind,
                "x": x,
                "y": y,
                "row_count": source["row_count"],
            }
        if name == "compose_dashboard":
            refs = arguments.get("artifact_ids", [])
            if not isinstance(refs, list) or not 1 <= len(refs) <= 12:
                raise InvalidQuestion("Dashboard needs 1 to 12 artifacts")
            for ref in refs:
                if self.artifact(str(ref)).get("snapshot_id") != context.snapshot_id:
                    raise InvalidQuestion("Dashboard snapshot mismatch")
            artifact = self.store.put(
                {
                    "kind": "dashboard",
                    **scope,
                    "title": str(arguments.get("title", "Dashboard")),
                    "artifact_ids": refs,
                    "version": 1,
                }
            )
            return {"artifact_id": artifact["artifact_id"], "widget_count": len(refs)}
        if name == "forecast_state":
            requested = date.fromisoformat(str(arguments.get("date", cutoff)))
            mode = arguments.get("mode", "ml")
            if requested != context.target_date and mode != "scenario":
                return {
                    "available": False,
                    "reason": "No ML run at this date",
                    "available_mode": "scenario",
                }
            with (self.root / "artifacts/degradation_curve.csv").open() as handle:
                rows = [
                    r
                    for r in csv.DictReader(handle)
                    if int(r["id"]) == context.pipe_id and r["kind"] == "прогноз"
                ]
            years = (requested - context.target_date).days / 365.25
            if not 0 <= years <= 10:
                raise InvalidQuestion("Scenario date must be within T to T+10 years")
            values = [
                {
                    "segment_id": int(r["segment_id"]),
                    "thickness_mm": max(0.5, float(r["thickness"]) - years * float(r["rate_mm_y"])),
                }
                for r in rows
            ]
            artifact = self.store.put(
                {
                    "kind": "table",
                    **scope,
                    "date": requested.isoformat(),
                    "method": "ml" if years == 0 else "linear_scenario",
                    "columns": ["segment_id", "thickness_mm"],
                    "rows": values,
                    "row_count": len(values),
                }
            )
            return {
                "artifact_id": artifact["artifact_id"],
                "method": artifact["method"],
                "min_mm": min(r["thickness_mm"] for r in values),
                "mean_mm": mean(r["thickness_mm"] for r in values),
            }
        if name == "compare_pipes":
            return compare(self.root, arguments.get("pipe_ids", [context.pipe_id]), cutoff)
        return self.methods.search(str(arguments.get("query", "коррозия вода CO2")))
