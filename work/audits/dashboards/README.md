# Dashboard frontend acceptance — 2026-11-15

Scope: frontend constructor, existing real profile API, no backend or 3D-engine changes.

- `npm run verify`: 394 tests / 47 files; rules, TypeScript, Biome and production build passed.
- `E2E_BASE_URL=http://localhost:18081 npx playwright test e2e/dashboards.spec.ts`: four Chromium scenarios against deployed Compose backend, no intercepted numerical data.
- Browser coverage: 1440/375 px, light/dark, reduced motion, no horizontal overflow, axe with zero violations, local persistence, keyboard reorder, resize, cancelled pointer drag, creation/deletion/undo, unavailable generator.
- Generator tests: valid preview, refinement, library save and placement share definition ID, duplicate-add prevention, invalid draft, retry, cancellation, context change, unavailable transport. The successful generator uses a test double only in tests.
- Screenshots inspected in desktop/mobile light/dark. Queue simplified after first check; duplicate landmark removed. Final captures included here.
- Existing nonblocking warnings: shared data-table CSS selector specificity; main 3D route exceeds Vite chunk-size recommendation.
- Frontend image rebuilt and service healthy on 18081; backend service not rebuilt.

Production agent generation remains unavailable because current AssistantEvent does not contain structured widget data. Existing seven engineering kinds are the supported registry; free SQL/HTML/JavaScript and arbitrary sources are unsupported. RU is the product language; EN dictionary parity is maintained, but no separate EN visual matrix was requested.
