# Session state

Updated2026-11-15, MSK. Earlier instructions and history preserved verbatim:
work/audits/engineering-assistant/session-before-assistant.md.

## Active user instructions

«так друг, твоя задача изучить как у меня реализован чатик для агента тут /Users/kaifarikman/hackathons/casechamp и ты должен его подключить.»
«уйди в отдельный ворктри и там поработай»
«ну ты сделай чисто фронтенд, без бэкенд реализации!!!»
«если ты написал уже бэк, то удаляй. мы пишем просто фронтенд брат»

Latest scope overrides the initial server-agent requirement: FRONTEND ONLY. All new backend code,
tests, dependencies, config and private venv were deleted/restored. Backend18110 stopped.
Do not implement backend or LLM server. No runtime fake answers. No changes/push to dev.
Preserve duppel, Onest, both themes, Russian UI and existing3D pipe with rotation and three modes.

## Current work

Worktree /Users/kaifarikman/hackathons/innoglobal-assistant, branch feat/engineering-assistant,
HEAD4db9fdac6367f238391b2984791fd99d8423a6f3. Base feat/frontend including its pre-existing dirty
frontend state. Original worktree and service18080 retained. No commit or push.

Frontend at http://127.0.0.1:18180, Vite proxies unchanged backend18010.
Facts+assistant/data tabs, compact context, collapsible queue/scene, frontend stream contract,
frozen request context, validated actions/sources, chart highlighting/reset, mobile Drawer.
Assistant endpoint is absent: explicit not-connected UI. Future wire types live in shared/api,
original generated schema restored. Study/reuse casechamp stream/context/cancel patterns only.

Evidence and checks: work/audits/engineering-assistant/README.md. npm run verify382tests and
6browser scenarios passed; final confirmation/reviewer documented there. Browser test responses
exist only in tests. Existing large chunk warning. Next: user reviews frontend18180.

## Publication

User: «запушь агента в ветку feat/frontend просто такого, и все, чисто агентика с фронтом. ну и пофикси чтобы чат был большим и удобным.»
Copied frontend to original worktree feat/frontend, committed and pushed
d364b6c684bcba489a41c5b8817cc70dbc858980. Only frontend/ in commit; backend unchanged.
480px chat,800px expandedDrawer,compactfacts,16px text,96px composer.382tests and7browser
checks pass; reviewer ship/documenter no corrections. Evidence large-chat-*. This worktree stays
feat/engineering-assistant at4db9fda with matching uncommitted frontend; published branch is
feat/frontend. Preview18180 remains, Compose18080 not rebuilt.
