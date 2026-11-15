# Live product design

2026-11-15 user: «включи мне весь продукт на новом дизайне».

Transferred the v55 fleet/workspace composition from f8c1531 into the React product.
The imported HTML remains a separate historical prototype; the production app uses live APIs.

- `/`: fleet cards with a local copy of the original v55 pipe image, actual directions,
  wall minima, forecast dates, inspection dates and queue counts.
- `/?pipe=...&segment=...`: left metrics rail, coordinate navigation, existing WebGL route,
  unroll and section controls, overview strip, comparison chart and evidence disclosure.
- Queue opens in a drawer, with original grouping/sorting/export and segment selection.
- Assistant opens in a wide drawer; embedded mode avoids a nested chat modal, preserves draft
  and conversation on close. Source evidence uses its own existing dialog only when requested.
- `/dashboards`, `/data`, `/model` are available in the common application shell.
- RU/EN locale resources and both themes retained; original WebGL engine retained, rather than
  replacing engineering interactions with the static prototype scene.

Local product: http://localhost:5179. API: http://127.0.0.1:8000,
LANGUAGE_MODEL=codex; snapshot b5169168fd55 ready with no issues after restart.
Backend exec 57995, PID 52969. Vite exec 59411, PID 37012.
Prototype remains separately at port 5188.

Validation: frontend rules, types, lint, 386 tests and build pass.
Browser QA covers light/dark at 375/1440, no horizontal overflow and chat draft persistence.
Backend's previous 159-test verification is recorded in work/pydantic-implementation-status.md.
No live model call, commit or push performed in this task.

Final QA: all 25 browser scenarios pass across verification runs (21 in full run,
4 corrected scenarios in the final focused run). Includes axe audits of fleet, workspace,
dashboards, data, model and missing routes in both themes; actual API-backed WebGL selection,
cut/unroll controls, queue grouping/export, late response context, retry/stop, chat persistence,
missing evidence and WebGL loss. Live provider requests are replaced only in browser tests.
Logs: /private/tmp/innopa-final-e2e.log, /private/tmp/innopa-corrected-e2e.log,
/private/tmp/innopa-new-design-final.log. Last frontend verify passes: 386 tests.

Fixed nested drawer Escape propagation so closing source evidence leaves the assistant open.
Coordinate browser checks now wait for modal closure before filling an inert background input.
Empty fleet has an explicit empty state; evidence disclosure labels are distinct.
Final fleet screenshot: /private/tmp/innopa-fleet-final.png; UI test screenshots:
/private/tmp/product-chat-{light,dark}-{375,1440}.png. Existing desktop/mobile scene screenshots
are under work/audits/material-workspace/. Browser opened http://localhost:5179 for the user.
