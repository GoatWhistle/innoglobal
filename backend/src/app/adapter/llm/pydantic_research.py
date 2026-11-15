import asyncio
import json
from collections.abc import AsyncIterator
from dataclasses import asdict, dataclass

from openai import OpenAIError
from pydantic_ai import Agent, Tool, ToolReturn
from pydantic_ai.exceptions import AgentRunError
from pydantic_ai.models import Model
from pydantic_ai.models.openai_codex import OpenAICodexModel
from pydantic_ai.usage import UsageLimits

from app.domain.assistant import AssistantQuestion
from app.domain.errors import DomainError
from app.domain.inference import JsonSchema
from app.usecase.assistant import event
from app.usecase.assistant_prompt import SYSTEM
from app.usecase.research import ResearchData

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


@dataclass
class Claim:
    text: str
    evidence_ids: list[str]


@dataclass
class Answer:
    claims: list[Claim]


class PydanticResearch:
    def __init__(self, data: ResearchData, model: Model | None = None) -> None:
        self.data = data
        self.model = model
        self.slots = asyncio.Semaphore(2)

    async def stream(self, question: AssistantQuestion) -> AsyncIterator[JsonSchema]:
        queue: asyncio.Queue[JsonSchema] = asyncio.Queue()
        evidence: dict[str, JsonSchema] = {}
        artifacts: list[str] = []

        def register(name: str) -> Tool[None]:
            async def invoke(arguments: dict[str, object]) -> ToolReturn:
                try:
                    result = await asyncio.to_thread(
                        self.data.execute, name, arguments, question.context
                    )
                except DomainError as exc:
                    return ToolReturn(return_value={"error": exc.message})
                key = f"E{len(evidence) + 1}"
                packet = {"evidence_id": key, "tool": name, "result": result}
                if len(json.dumps([*evidence.values(), packet], default=str)) > 32000:
                    return ToolReturn(return_value={"error": "Evidence budget exceeded"})
                evidence[key] = packet
                artifact_id = result.get("artifact_id")
                if isinstance(artifact_id, str):
                    artifacts.append(artifact_id)
                    await queue.put(event("artifact", artifact_id=artifact_id))
                await queue.put(event("status", code="reading"))
                return ToolReturn(return_value=packet, metadata={"artifact_id": artifact_id})

            return Tool(
                invoke,
                name=name,
                description=f"{name}: arguments are tool parameters. "
                "query_data: sql. render_chart: data_ref, kind, x, y. "
                "forecast_state: date, mode (ml or scenario). "
                "compose_dashboard: title, artifact_ids. compare_pipes: pipe_ids. "
                "explain_corrosion: segment_id. data_catalog: optional table for full descriptions. "
                "search_methodology: query (Russian or English). Other tools: empty arguments.",
            )

        async def run() -> None:
            try:
                async with asyncio.timeout(180), self.slots:
                    agent = Agent(
                        self.model or OpenAICodexModel("gpt-6.1-sol"),
                        output_type=Answer,
                        tools=[register(name) for name in NAMES],
                        instructions=SYSTEM.split("Output kind=")[0]
                        + "\nUse native tools. Final output is claims. "
                        "Only cite evidence returned by tools in this run.",
                    )
                    result = await agent.run(
                        question.prompt
                        + "\nContext: "
                        + json.dumps(
                            {
                                "context": asdict(question.context),
                                "history": question.history[-12:],
                            },
                            default=str,
                        ),
                        usage_limits=UsageLimits(request_limit=16, tool_calls_limit=12),
                    )
                    if not result.output.claims:
                        raise ValueError("Empty answer")
                    for claim in result.output.claims:
                        if not claim.evidence_ids or any(
                            r not in evidence for r in claim.evidence_ids
                        ):
                            raise ValueError("Unknown evidence reference")
                    text = "\n\n".join(
                        f"{c.text} [{', '.join(c.evidence_ids)}]" for c in result.output.claims
                    )
                    await queue.put(event("delta", text=text))
                    await queue.put(event("done"))
            except (
                AgentRunError,
                OpenAIError,
                DomainError,
                ValueError,
                TimeoutError,
                KeyError,
                TypeError,
                OSError,
            ):
                await queue.put(event("error", code="unavailable"))

        task = asyncio.create_task(run())
        try:
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), 10)
                except TimeoutError:
                    yield event("status", code="reading")
                    continue
                yield item
                if item["type"] in ("done", "error"):
                    break
        finally:
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
