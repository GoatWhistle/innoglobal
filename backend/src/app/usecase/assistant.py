import asyncio
import json
from collections.abc import AsyncIterator
from dataclasses import asdict

from app.domain.assistant import AssistantQuestion
from app.domain.errors import DomainError, InvalidQuestion, ModelFailure
from app.domain.inference import Effort, JsonSchema, StructuredRequest, Tier
from app.usecase.assistant_prompt import SYSTEM, step_schema
from app.usecase.assistant_tools import TOOL_NAMES, AssistantTools
from app.usecase.interface import LanguageModel, Logger

MAX_TOOL_CALLS = 4
MAX_EVIDENCE_CHARS = 32000


def event(kind: str, *, text: str = "", code: str = "", **fields: object) -> JsonSchema:
    return {"type": kind, "text": text, "code": code, "actions": [], "values": [], **fields}


def render_claims(output: JsonSchema, evidence: list[JsonSchema]) -> str:
    claims = output.get("claims")
    known = {item["evidence_id"] for item in evidence}
    if not isinstance(claims, list) or not 1 <= len(claims) <= 8:
        raise ModelFailure()
    lines = []
    for claim in claims:
        if not isinstance(claim, dict):
            raise ModelFailure()
        text, refs = claim.get("text"), claim.get("evidence_ids")
        if (
            not isinstance(text, str)
            or not text.strip()
            or len(text) > 1500
            or not isinstance(refs, list)
            or not refs
            or any(not isinstance(ref, str) or ref not in known for ref in refs)
        ):
            raise ModelFailure()
        lines.append(f"{text.strip()} [{', '.join(refs)}]")
    sources = "; ".join(
        f"{item['evidence_id']}: {item['tool']}, сегмент {item['segment_id']}" for item in evidence
    )
    return "\n\n".join(lines) + f"\n\nИсточники: {sources}."


class EngineeringAssistant:
    def __init__(
        self, tools: AssistantTools, language: LanguageModel | None, logger: Logger
    ) -> None:
        self._tools, self._language, self._logger = tools, language, logger
        self._slots = asyncio.Semaphore(2)

    def validate(self, question: AssistantQuestion) -> None:
        if not question.prompt.strip() or len(question.prompt) > 4000:
            raise InvalidQuestion()
        if sum(len(content) for _, content in question.history) > 24000:
            raise InvalidQuestion("Assistant history exceeds the context budget")
        self._tools.validate(question.context)

    async def stream(self, question: AssistantQuestion) -> AsyncIterator[JsonSchema]:
        self.validate(question)
        yield event("status", code="reading")
        try:
            async with asyncio.timeout(110), self._slots:
                async for item in self._research(question):
                    yield item
        except TimeoutError:
            yield event("error", code="timeout")
        except DomainError as exc:
            self._logger.warning("assistant_failed", code=exc.code)
            yield event("error", code="unavailable")

    async def _research(self, question: AssistantQuestion) -> AsyncIterator[JsonSchema]:
        evidence: list[JsonSchema] = []
        context = question.context

        async def read(name: str, segment_id: int) -> JsonSchema:
            result = await asyncio.to_thread(self._tools.call, name, segment_id, context)
            packet = {
                "evidence_id": f"E{len(evidence) + 1}",
                "tool": name,
                "segment_id": segment_id,
                "snapshot_id": context.snapshot_id,
                "pipe_id": context.pipe_id,
                "target_date": context.target_date.isoformat(),
                "data": result,
            }
            if len(json.dumps([*evidence, packet], default=str)) > MAX_EVIDENCE_CHARS:
                raise ModelFailure("Assistant evidence budget exceeded")
            evidence.append(packet)
            return packet

        initial = await read("segment", context.segment_id)
        yield event("evidence", values=[initial["data"]])
        if self._language is None:
            ranking = await read("priorities", context.segment_id)
            data, rank = initial["data"], ranking["data"]
            text = (
                "Сводка по данным, без LLM. Свободный анализ вопроса недоступен.\n\n"
                f"Прогноз: {data['forecast_mm']} мм на {context.target_date}. [E1]\n\n"
                f"Место по прогнозной толщине: {rank['rank']} из {rank['total']}; "
                f"одинаковый прогноз у {rank['equal_forecasts']} сегментов. "
                "При равенстве порядок задаёт номер сегмента. "
                "Это очередь проверки, не вероятность отказа. [E2]"
            )
            yield event("delta", text=text)
        else:
            for step in range(MAX_TOOL_CALLS + 1):
                prompt = json.dumps(
                    {
                        "question": question.prompt,
                        "context": asdict(context),
                        "untrusted_history": question.history[-12:],
                        "evidence": evidence,
                        "remaining_tool_calls": MAX_TOOL_CALLS - step,
                    },
                    ensure_ascii=False,
                    default=str,
                )
                completion = await self._language.complete(
                    StructuredRequest(
                        system=SYSTEM,
                        prompt=prompt,
                        schema=step_schema(
                            [item["evidence_id"] for item in evidence],
                            final=step == MAX_TOOL_CALLS,
                        ),
                        tier=Tier.SMART,
                        effort=Effort.MEDIUM,
                    )
                )
                self._logger.info(
                    "assistant_step",
                    model=completion.usage.model,
                    step=step,
                    input_tokens=completion.usage.input_tokens,
                    output_tokens=completion.usage.output_tokens,
                )
                output = completion.output
                if output.get("kind") == "answer":
                    yield event("delta", text=render_claims(output, evidence))
                    break
                name, segment_id = output.get("tool"), output.get("segment_id")
                if (
                    step == MAX_TOOL_CALLS
                    or output.get("kind") != "tool"
                    or name not in TOOL_NAMES
                    or type(segment_id) is not int
                    or any(e["tool"] == name and e["segment_id"] == segment_id for e in evidence)
                ):
                    raise ModelFailure("Invalid assistant research step")
                yield event("status", code="reading")
                packet = await read(name, segment_id)
                values = packet["data"].get("items", []) if name == "neighbors" else []
                yield event("evidence", values=values)
        yield event(
            "done",
            actions=[{"kind": "source", "source": "segment", "segment_ids": [context.segment_id]}],
        )
