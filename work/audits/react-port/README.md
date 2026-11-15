# React port verification / 2026-11-15

The application now owns the approved prototype interactions; it does not load preview.html.
Map network and all pipeline measurements come from FastAPI. The static country outline is
Natural Earth geometry. Backend assistant calculations read the same catalog snapshot.

Verified locally:
- `npm run verify`: 36 rule checks, TypeScript, Biome, 382 tests and production build pass.
- Backend Ruff, mypy and 131 unit/integration tests pass with real DuckDB fixtures.
- `E2E_BASE_URL=http://127.0.0.1:5191 npx playwright test e2e/engineering-assistant.spec.ts --workers=1`: 4 pass.
- `node work/audits/react-port/check.mjs`: map entry, segment inspection, live priority reply,
  left docking, unroll selection preservation, light theme and 375px layout; no page errors or overflow.
- Screenshots beside this file: dark/light unroll, mobile light, inspection, map and chat.

Corrected during verification: excessive grid height, missing action segment_ids, stale-context
source selection, mobile overflow risk and removed obsolete assistant selectors.

Limits: no free-form LLM analysis; deterministic data-backed assistant supports the named
calculations. Oil discharge and corrosion shapes are illustrations, not measured leak geometry.
The WebGL route bundle exceeds Vite's 500 kB advisory threshold (about 672 kB uncompressed).
Old product e2e selectors target the previous workspace and have not all been migrated; the
updated assistant suite and explicit port scenario are the browser evidence for this change.

Production verification: `duppel-live` Compose build and both service healthchecks pass.
The same browser scenario passed at http://127.0.0.1:18081, with `ready:true`, no data
issues, no JavaScript errors and no horizontal overflow at 375px. Latest screenshots
come from this production build. Implementation commits: backend 3ef7f7c, frontend 06dc95c.
