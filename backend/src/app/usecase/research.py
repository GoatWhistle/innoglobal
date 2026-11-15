from collections.abc import AsyncIterator
from typing import Protocol

from app.domain.assistant import AssistantContext, AssistantQuestion
from app.domain.inference import JsonSchema


class ResearchData(Protocol):
    def execute(
        self, name: str, arguments: JsonSchema, context: AssistantContext
    ) -> JsonSchema: ...
    def artifact(self, artifact_id: str) -> JsonSchema: ...
    def dashboards(self) -> list[JsonSchema]: ...


class ResearchRunner(Protocol):
    def stream(self, question: AssistantQuestion) -> AsyncIterator[JsonSchema]: ...


class DashboardData(ResearchData, Protocol):
    def versions(self, artifact_id: str) -> list[JsonSchema]: ...
    def refresh(self, artifact_id: str) -> JsonSchema: ...
