## PydanticAI implementation in progress

User approved nine tools, Codex Responses, local SQLite, saved snapshots with refresh,
multiple comparison criteria, and a separately labelled extrapolation scenario.
Dependencies installed: pydantic-ai-slim[openai] 2.68.0, sqlglot, aiosqlite.
Native PydanticAI runner and artifact HTTP/client path added; SQL cutoff/source guards,
SQLite artifact persistence, preliminary graphs/dashboard composition implemented.
152 backend tests and frontend verify passed before final configuration edits.
Plan remains incomplete: methodology corpus/search, full comparison metrics, migrations,
dashboard version refresh/pages, correct interactive chart axes, sessions and browser QA.
Do not call this complete. New runner uses Codex OAuth rather than CODEX_API_KEY.
No commits, pushes or intentional paid checks. See docs/assistant.md transition status.

## Six requested fixes, 2026-11-15

Column catalog with units/comments, complete-result SQL statistics including DECIMAL,
inspection/regime/forecast comparison, local FTS5 over two source-backed methodology notes,
immutable dashboard versions with recipe refresh/history page, and real table pagination added.
159 backend tests, mypy/ruff and frontend verify (382 tests) passed. Chromium checked pagination,
refresh v2, and loaded chart points at 375/1440 in both themes. Local backend still needs a final
restart for the last DECIMAL/statistics changes. User next requested frontend from f8c1531.
