import asyncio
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass

from fastapi import FastAPI

from app.adapter.decision.lexical import LexicalDecisionModel
from app.adapter.decision.system_one import SystemOneModel
from app.adapter.log.stdlib import StdlibLogger
from app.controller.errors import ErrorHandlers
from app.controller.router import api_router_v1
from app.repository.duckdb.source import DataPaths, DuckdbSnapshotSource
from app.repository.explanations import FileExplanations
from app.repository.research_data import ResearchDataSource
from app.repository.research_store import ResearchStore
from app.settings import ConfigError, DecisionProvider, LanguageProvider, Settings, load_settings
from app.usecase.assistant import EngineeringAssistant
from app.usecase.assistant_tools import AssistantTools
from app.usecase.catalog import ForecastCatalog
from app.usecase.interface import DecisionModel, LanguageModel, Logger, SnapshotSource


@dataclass(frozen=True, slots=True)
class Providers:
    decision: DecisionModel
    language: LanguageModel | None
    logger: Logger

    async def aclose(self) -> None:
        await self.decision.aclose()


def build_decision_model(settings: Settings) -> DecisionModel:
    match settings.decision_provider:
        case DecisionProvider.LEXICAL:
            return LexicalDecisionModel()
        case DecisionProvider.SYSTEM_ONE:
            return SystemOneModel(
                base_url=settings.decision_url,
                api_key=settings.decision_api_key,
                timeout_s=settings.decision_timeout_s,
            )


def build_language_model(settings: Settings) -> LanguageModel | None:
    match settings.language_provider:
        case LanguageProvider.NONE:
            return None
        case LanguageProvider.CLAUDE:
            try:
                from app.adapter.llm.claude_agent import ClaudeAgentModel
            except ModuleNotFoundError as exc:
                raise _missing_llm_group(settings, exc) from exc
            return ClaudeAgentModel()
        case LanguageProvider.CODEX:
            try:
                from app.adapter.llm.codex_agent import CodexAgentModel
            except ModuleNotFoundError as exc:
                raise _missing_llm_group(settings, exc) from exc
            return CodexAgentModel(api_key=settings.codex_api_key)


def _missing_llm_group(settings: Settings, exc: ModuleNotFoundError) -> ConfigError:
    return ConfigError(
        f"LANGUAGE_MODEL={settings.language_provider.value} needs package {exc.name!r}; "
        "install the llm dependency group (uv sync --group llm) or build the image with LLM=true"
    )


def create_app(settings: Settings | None = None, source: SnapshotSource | None = None) -> FastAPI:
    config = settings or load_settings(os.environ)
    language = build_language_model(config)
    logger = StdlibLogger("app")

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        providers = Providers(
            decision=build_decision_model(config), language=language, logger=logger
        )
        app.state.providers = providers
        snapshots = source or DuckdbSnapshotSource(DataPaths.under(config.data_root))
        catalog = ForecastCatalog(snapshots, logger)
        await asyncio.to_thread(catalog.refresh)
        app.state.catalog = catalog
        app.state.assistant = EngineeringAssistant(
            AssistantTools(
                catalog, FileExplanations(config.data_root / "artifacts/explain_cards.jsonl")
            ),
            language if config.language_provider is LanguageProvider.CODEX else None,
            logger,
        )
        app.state.research_data = ResearchDataSource(
            config.data_root,
            ResearchStore((config.state_root or config.data_root / "var") / "assistant.sqlite3"),
            AssistantTools(
                catalog, FileExplanations(config.data_root / "artifacts/explain_cards.jsonl")
            ),
        )
        if config.language_provider is LanguageProvider.CODEX:
            app.state.research_runner = build_research_runner(app.state.research_data)
        else:
            app.state.research_runner = None
        try:
            yield
        finally:
            await providers.aclose()

    app = FastAPI(title="duppel", lifespan=lifespan)
    ErrorHandlers(logger).register(app)
    app.include_router(api_router_v1)
    return app


def build_research_runner(data: ResearchDataSource) -> object:
    from app.adapter.llm.pydantic_research import PydanticResearch

    return PydanticResearch(data)
