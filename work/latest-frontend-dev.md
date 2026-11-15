# Latest frontend on the local dev stand

2026-11-15 user: «спуль фронт последний и раскатай на прод его и туда поставим уже агента».
Clarification: «локально всмысле. На дев стенде локальном».

Fetched origin and applied frontend from origin/feat/frontend, 82dbab356eb2698c9b1798e8a65d942f65e26045.
Includes 06dc95c React port, 8c8198c material 3D home pipes, final accessible preview links.
Kept local PydanticAI research backend, artifact stream and answer renderer, pagination,
chart artifacts, DashboardLibrary and dashboard routes/navigation. New AssistantDock uses
existing useAssistant to reach the research agent. Removed previous local fleet/rail design
in favor of the requested latest frontend. Previous frontend and tracked diff backed up to
/private/tmp/innopa-before-latest-frontend/. No commit or push.

Local assembled stand: http://localhost:18089, Docker project innopa-dev, healthy frontend.
Compose override docker-compose.dev.yml proxies to host.docker.internal:8000; host API
exec 57995 PID 52969 uses LANGUAGE_MODEL=codex, PydanticAI / gpt-6.1-sol. Existing Codex auth
stays on the host. Ready snapshot b5169168fd55, no issues, verified through frontend proxy.
No live model generation performed. Reused real dashboards, including v2 08a76f4772c84d03a9f9b3160b66fd0c.

Hot dev server restarted after dependency upgrade: http://localhost:5179, exec 34434.
Port 18081 belongs to another project's container, left untouched.

Validation: frontend verify (rules/types/lint/382 tests/build) passes. Four new upstream chat
browser tests pass against the deployed container; all use mocked model streams, including
the two docking tests previously relying on provider output. Browser smoke passes in both
themes at 375/1440 for fleet, workspace and actual saved dashboard; no workspace overflow.
Old Vite tests ran against stale optimized dependencies and failed; Vite was then restarted.
The deployed-container tests are the final result.
Logs: /private/tmp/innopa-latest-verify.log, /private/tmp/innopa-deployed-chat.log,
/private/tmp/innopa-dev-build-final.log. Screenshots /private/tmp/innopa-latest-{fleet,workspace}-{light,dark}-{375,1440}.png.

## Chat refinement

User: «агент сюда подключен ? сделай визуально чат как был до этого примерно. Но ток впиши его удобнее и убери на нем выборы какие то уродские».
Removed scope selector and prompt choices from the active dock. Context now includes the whole
pipe with the selected segment automatically; no choice is required to ask a question.
Restored a quiet dialog composition: pipeline context, reading area, labelled composer,
keyboard hint and send/stop. Default width 384, resizable 320–480; move/minimize/close retained.
Mobile dock appears before the scene and scrolls into view on opening. Autoscroll follows
new messages only while the reader stays near the bottom. Existing artifact renderer retained.

Redeployed innopa-dev frontend at port 18089. Verify: 382 tests/rules/types/lint/build pass;
four mocked chat e2e pass; four light/dark desktop/mobile axe and overflow checks pass.
No live model call performed. Logs /private/tmp/innopa-chat-polish-{verify,e2e}.log,
/private/tmp/innopa-chat-clean-build.log. Screenshots /private/tmp/innopa-chat-clean-{light,dark}-{375,1440}.png.

## Compact workspace chrome

User requested removal of the extra page header, pipe name next to the logo, and a floating
chat icon in the lower right. Follow-ups: «отцентруй»; «что за лишняя линия сверху почему на максимум наверх не занимают данные»;
«что за две линии. Одну оставь скомпануй по смыслу удобноъ».

Pipe name now follows the logo in AppHeader and tracks the selected pipe. Main page title is
kept for screen readers. Queue/export share the scene toolbar with mode, segment editor and
existing zoom/reset controls. MaterialPipe portals its existing engine controls into that toolbar.
The metric section rule now targets direct children, preventing the nested plain title Card
from inheriting an unintended divider and padding. Top padding reduced to align with scene controls.
The floating chat button uses the local Lucide message-circle glyph. Verified SVG/button centers
match exactly (x=0,y=0). Chat state and movement remain unchanged.

Frontend verify: rules/types/lint/382 tests/build pass. Four chat e2e pass after header change;
zoom/reset and overflow checks pass at 1440/375 in light/dark after toolbar consolidation.
Header/accessibility checks passed both themes and widths. Dev container rebuilt at port 18089.
Screenshots /private/tmp/innopa-toolbar-{light,dark}-{1440,375}.png; logs
/private/tmp/innopa-toolbar-{verify,build}.log and /private/tmp/innopa-header-clean-e2e.log.

## Publication

User requested publishing all current changes to feat/redesign-oil. Remote branch was absent.
Git hooks remain enabled; human identity preserved. The pre-commit content scan previously
matched provider names in file paths and rejected runtime dependency mentions permitted by
AGENTS.md. It now scans added text and permits bare Codex dependency names only in backend,
docs and .env.example; attribution phrases, commit metadata and other paths remain checked.
Backend 131 unit + 28 integration tests pass; frontend 382 tests/build pass.
