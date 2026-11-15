# duppel: план готового продукта и промпт агенту

Дата: 14.11.2026. Ветка: `feat/redesign-oil`.

Цель: рабочий сайт для кейса прогноза деградации трубопроводов на реальных данных
из объединённой ML-ветки, с визуальным языком существующей дизайн-системы.
Это следующий этап после каталога компонентов: React-приложение, API, реальные
данные, проверенный запуск через Compose и законченный пользовательский сценарий.

Ниже — готовое задание агенту на реализацию. Инструкции агенту написаны на английском
по правилам репозитория; интерфейс и продуктовая документация — на русском.

## Agent prompt

Implement the complete duppel product in this repository. Execute the stages below,
including backend integration, production frontend, runtime verification and documentation.
Do not stop after planning, building static screens, or wiring one demonstration page.
Keep working until the acceptance checklist passes or a concrete external blocker remains.
This document is an implementation brief, not evidence that the product is already built.

### 1. Establish the actual baseline

Read `AGENTS.md`, the three `context/` files, `frontend/AGENTS.md`, `backend/AGENTS.md`,
`brief/README.md`, `brief/TASK.md`, `brief/requirements.md`, `brief/QA.md` if present,
`frontend/PRODUCT.md`, `frontend/DESIGN.md` and `docs/glossary.md`.
For backend work read its architecture, API, database and testing topic documents.
Load the relevant canonical skills from `skills/`, including the frontend workflows
required by the area instructions. Consult current official documentation for APIs used.

Use the current user branch `feat/redesign-oil`. Inspect Git status before edits and preserve
unrelated work. The ML branch was merged at `251a5ab`; its source tip was `f3d7a42`.
The prior design-only limitation is superseded by this task. Preserve approved branding:
`duppel`, Onest, existing graphite/paper themes, custom icons and pipe materials.
The user explicitly requested Russian-only UI; do not introduce a language toggle.
Continue using dictionary-based copy. Keep both light and dark themes.

Audit these existing sources before choosing schemas or moving code:

- `data/`, `data/processed/`, `warehouse/README.md`, `warehouse/sql/`,
  `warehouse/pipetwin.duckdb` and `warehouse/build.py`;
- `src/pipetwin/`, `run_all.py`, `requirements.txt`, `README-ML.md`;
- `result.csv`, `artifacts/`, `chart_data.json`, `charts.html`, `report.html`;
- `notes/align_rationale.md`, mentor answers and validation implementation;
- `work/design/ds/screen-pipe.html`, `pipe-kit.html`, foundation/component pages,
  `scanner/blueprints`, `wall/`, and the existing React app.

Record actual fields, units, null semantics, joins, dates, source provenance and artifact
compatibility in `docs/data-contract.md`. Resolve conflicts using source data and executable
code; imported README claims may be stale. Inspect CSV delimiters and encodings, database
version compatibility, model dependencies and paths inside containers.
The previously counted 2000 result rows are an observation, not sufficient proof of coverage.

Done: a documented mapping connects every planned domain view to existing source fields or
an explicitly implemented calculation. Missing information is listed without invented values.

### 2. Define the product scenario and data truth

The product predicts minimum residual wall thickness per 10 m segment at the target date.
It is not the removed live leak simulator. Do not restore leak insertion or leak detection.
Verify the currently configured targets against organizer/mentor sources:

- Case 1: pipe `1250022871`, target `2023-12-01`, forecasting between inspections.
- Case 2: pipe `1250009583`, target `2022-07-01`, forecasting from commissioning.

The primary journey is: choose a target pipe → inspect thickness along its length → select
a segment → inspect its evidence and forecast → review the lowest-thickness 10% → export.
Both cases must complete this journey. Show other pipes as supporting data only when useful.

Define segment interval boundaries, final partial segment, distance origin, ILI alignment,
IDs, units and target dates once on the backend. Separate observed thickness, forecast,
nominal thickness, missing observations and excluded measurements.
Never display withheld target inspection as observed truth. Validation comparisons must use
available held-out historical observations and identify the split and dates.
Distinguish squared Pearson correlation from coefficient of determination R².

Inspect actual uncertainty outputs: do not assume P10/P90 or P05/P95 from old prose.
Label actual quantiles and their method; state calibration limits. If absent, omit the band
with an honest explanation. Feature importance is global unless a local method exists;
do not manufacture per-segment causal explanations.

Rank the lowest predicted thickness per target pipe with a documented tie-breaking and
rounding policy. Call this inspection priority, not failure probability or an engineering
safety classification. Do not invent regulatory thresholds.

Done: the scenario and calculation rules are recorded in `docs/design-decisions.md` and
mapped to the case requirements, with no unresolved ambiguity hidden behind UI defaults.

### 3. Deliver data access and API

Reuse the imported persistent DuckDB and forecast artifacts through repository adapters.
This task integrates existing storage; it does not require selecting a new database.
Keep domain/usecase interfaces independent of DuckDB, pandas, FastAPI and ML libraries.
Use the backend composition root to wire read repositories and use cases.
Avoid retraining during application startup or HTTP requests. Serve a verified, versioned
forecast snapshot first. Preserve the offline reproducible training command separately.

Validate artifact relationships at ingestion/startup: unique pipe/segment pairs, full expected
coverage, finite values, units, valid bounds, interval ordering and agreement of source/model
versions. Report failures clearly; do not silently drop rows or replace data with fixtures.
Use read-only access for serving data. Make source paths configurable and mount/copy all
required assets in Compose. Do not overwrite the imported source snapshot during checks.
If regeneration is needed, use an isolated output and compare it before replacing anything.

Proposed API capabilities (final names may follow repository conventions):

| Endpoint under `/api/v1` | Purpose |
| --- | --- |
| `GET /pipes` | Target pipes, case, dates, coverage and computed summary |
| `GET /pipes/{id}` | Passport, sources, geometry availability and limitations |
| `GET /pipes/{id}/profile` | Distance, elevation where available, observed/forecast thickness |
| `GET /pipes/{id}/segments` | Filtered and sorted segments with pagination |
| `GET /pipes/{id}/segments/{segment_id}` | Segment evidence and forecast |
| `GET /pipes/{id}/priorities` | Deterministic inspection shortlist |
| `GET /data-quality` | Actual source coverage and available quality checks |
| `GET /model/validation` | Recorded metrics, baselines, splits and method |
| `GET /exports/result.csv` | Exact organizer output for both pipes |

Serve model-run/source metadata with relevant responses. Validate query bounds and missing IDs.
Document response/error schemas in `docs/api.md` and generate frontend OpenAPI types using
`npm run api:types`; use the existing shared client and TanStack Query.
Add liveness/readiness behavior that distinguishes process health from unavailable data.

Done: API queries execute against actual imported data, exports match the required columns
`id,segment_id,thickness_pred`, and missing/corrupt sources return actionable errors.

### 4. Build the complete React frontend

Use the approved HTML catalog as the visual reference and port behavior into the existing
React architecture. Do not embed the catalog or standalone ML report as the product UI.
Extract reusable primitives, design tokens and visualization components; preserve the
catalog as a reference. Avoid broad unrelated rewrites of imported ML experiments.

Implement these connected routes, with direct links and browser back/forward support:

1. Overview: both target pipes, forecast dates, real coverage, thickness summaries and a clear
   entry into inspection. Prefer meaningful comparisons to a grid of decorative KPI cards.
2. Pipe workspace: approved pipe-led composition, route/profile, thickness scan and section;
   synchronized segment selection across chart, table and pipe view; observed/forecast legend,
   accessible keyboard controls, zoom/range selection and return to full extent.
3. Inspection priorities: sortable/filterable real segment rows, persistent selected pipe,
   jump to the selected segment, and a documented CSV export.
4. Data and quality: source tables, inspection dates, coverage, exclusions and provenance,
   using actual computed warehouse results rather than hardcoded success badges.
5. Model and validation: baselines, actual metrics, held-out forecast–fact views when available,
   global feature importance, uncertainty method and known limitations.

Segment details may be a panel within the pipe workspace rather than a redundant route.
Every visible control must perform its stated action. Do not expose unsupported forecasting
for arbitrary dates, uploads, model switches or training buttons as working controls.

A 10 m minimum-thickness forecast does not define a circumferential defect field. Do not
turn it into invented pits or a measured 360° wall map. If using a section/unroll for navigation,
label schematic geometry and distinguish it from measurements. Use real terrain coordinates
only when present; otherwise show distance/elevation or a clearly labelled schematic route.
Oil animation is illustrative and must not imply measured real-time telemetry.

Build loading skeletons, empty states, retryable errors, missing observation states, unknown
routes and API outage behavior. Keep the current useful view during refresh where safe;
surface stale data and avoid selection races when changing pipes quickly.
Provide a functional 2D fallback for WebGL failure and reduced-motion behavior.
Handle responsive charts/tables, long labels, focus management, contrast and touch input.
Use Russian units, formatting, explanatory copy and accessible names consistently.

Done: all routes use the real API, both cases work, and no hardcoded domain data or mock
fallback enters production sources. Product UI contains no development implementation notes.

### 5. Verify and finish the stand

Make the complete stack start through the repository's documented Compose workflow with
no paid credentials. Confirm API proxying, healthchecks, database mounts, SPA deep links,
asset loading and persistence across restart. Document exact commands that actually ran.
Training may be a separate offline command; viewing existing forecasts must work immediately.

Add meaningful integration coverage for data-to-API mappings, both case forecasts, segment
boundaries, priority ranking and CSV export. Check UI/API agreement on sampled first, middle,
last and priority segments from each pipe. Verify all expected segments, not just row count.
Use browser tests for the complete primary journey and unavailable API behavior.

Run repository-required checks:

- Frontend: `cd frontend && npm run verify`.
- Backend: `cd backend && uv run ruff check .`, `uv run mypy .`,
  `uv run pytest tests/unit`, and `uv run pytest tests/integration`.
- Run applicable existing ML/data checks discovered during the audit; do not invent commands.
- Run browser scenarios and visually inspect at least 375px and 1440px in both themes,
  Russian UI, keyboard navigation, reduced motion and WebGL fallback.

Record failures and their baseline status. Fix regressions and defects blocking the primary
journey; do not claim all checks pass if a tool or dependency prevented a check.
Do not rerun expensive training merely to display already available validated artifacts.
If training is required, record environment, seed, inputs, outputs and measured results.

Update `README.md`, `docs/running.md`, `docs/api.md`, `docs/data-contract.md`,
`docs/design-decisions.md` and `docs/evidence.md` with implemented behavior and limitations.
Remove obsolete product claims about live leaks and synthetic-only operation where superseded.
Apply the `humanizer` skill to released product prose. Capture verification evidence under
`work/audits/full-product/`. Review the final diff using the code-review skill.
Update session state and run `python3 .claude/scripts/context_budget.py` before stopping.
Do not publish or deploy externally as part of this local implementation task.

### Completion checklist

- [x] Compose starts frontend and backend with real data and no paid keys.
- [x] Both target pipes and target dates are verified against source evidence.
- [x] Every expected segment has one traceable forecast; export passes coverage checks.
- [x] Overview, workspace, priorities, data quality and model views are connected and functional.
- [x] Selecting a segment synchronizes views and exposes its actual available evidence.
- [x] UI values and exports agree with backend/source data.
- [x] Observations, predictions, illustrative geometry and unknown values are distinguishable.
- [x] No invented target observations, confidence levels, safety thresholds or causal claims.
- [x] Approved visual identity survives the React implementation in both themes and mobile.
- [x] Error states, keyboard access, deep links and WebGL fallback work.
- [x] Required checks and browser verification are recorded with honest outcomes.
- [x] Launch instructions and product documentation describe the actual delivered system.

In the final handoff, give the working local URL, launch command, implemented journey,
verification results and remaining concrete limitations. A static catalog with imported files
on disk does not satisfy this task.

Verification record: [full-product progress review](audits/full-product/progress-review.md).
