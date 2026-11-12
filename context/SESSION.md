# Session state

Updated: 2026-11-12, MSK

## Explicit user instructions

- 2026-11-12: «наша задача сделать кртое лого, название на английском, сделать дизайн систему»;
  «будем продумывать ВСЕ ВСЕ ВСЕ до самых мелких деталей».
- 2026-11-12: дизайн-система casechamp — образец формата, «воровать от туда ничего не надо, просто мы
  делаем типа свое все для этого хака».
- 2026-11-12: референс monopo (https://monopo.vn/, Refero style 3e52dd36), «это просто как референс
  многое можно еще менять и обсудим».
- 2026-11-12: «делаем как светлую так и темную тему, язык только руский».
- 2026-11-12: «свои шрифты, полсоы прокруток, выпадающие списки, ... кнопки, иконки, ошибки, иконки
  не надо брать дефолтные, главное не ИИ слоп, делаем пиздато и качесвтенно чтобы было гармонично».
- 2026-11-12: «надо как то использовать веб гл, ... круто показывать нефть, трубы, как течет ... можно
  и 3d».
- 2026-11-12: порядок: «после базовой дизайн системы придумае название и лого».
- 2026-11-12: «запушь все наши изменения в ветку отдельную назови feat/redesign-oil без коммита и пуша от агентов а как бы от моего лица».

## Current state

- Task: publish all design-system, simulation and scene changes on feat/redesign-oil using the
  configured human Git author and committer, with subject-only commits and no attribution trailers.
- Page: /work/design/ds/pipeline.html, code work/design/ds/pipeline/ (15 modules, all under 250 lines).
- Layered pipe (steel, wool, aluminium jacket), stepped cutaway, flanges, supports, sensors,
  screen-space fluid jet, puddle, camera focus and drag orbit. Reuses the shared Worker simulation.
- Checked in Chrome: calm, leak, reset, both themes, orbit, 375 px, nogl fallback. 5 node tests pass.
  Evidence and limits: work/audits/pipeline/README.md. Reduced motion not exercised live.
- Earlier scope: HTML design-system screens improved; full React simulator excluded by user.
- Branch: feat/redesign-oil, created from main at b6a8336. Remote: origin on GoatWhistle/innoglobal.
- Server: Python HTTP server at 127.0.0.1:5178, serving repository root.

## Implemented and checked

- Restored frontend dependencies (Three.js and fonts previously returned 404).
- Replaced missing PNG scene with live WebGL and interactive SVG fallback.
- Shared Worker simulation, seeded computed previews, event-derived latency, acceptance/reset.
- Desktop scene/status plus two charts, disclosed sensors, vertical mobile layout.
- Full pipe cutaway with advected oil normals; insertion and detector labels are separate.
- Warm surfaces, local alarm accents, no blinking, readable SVG labels at 375 px.
- Normal, observation, leak, acknowledgement, no-3D mode viewed in Chrome.
- Desktop 1440×900 dark and 1280×800 light checked with responsive DevTools; 375 px both themes
  checked through the screen catalog. Screenshots and limitations: work/audits/pipetwin/README.md.
- npm --prefix frontend run verify: 36 rules, 316 tests and build passed.
- npm --prefix frontend run e2e: 4 axe checks passed (React scaffold, not HTML examples).
- node --test work/design/ds/runtime/session.test.mjs: 10 tests passed.
- Before publication, combined scene and simulation suite: 24 tests passed.
- Impeccable detector on runtime, screen CSS and semantic tokens: no findings.

## Next actions and limits

- Full React product and valve-control simulation are not implemented, by scope.
- Synthetic disturbance model is not a validated hydraulic transient solver.
- Hidden-tab timing and reduced motion are implemented; no live browser suspension test or real
  context-loss injection was performed. No-3D mode was exercised directly.
- Browser screenshot artifacts include Chrome UI. Before and final after/leak are saved.
- Build emits an existing PostCSS from-option warning; e2e health proxy logs connection refused
  because backend is not running, while all four accessibility tests pass.
- First e2e pass found a Segmented contrast defect. Selection now paints its own background; rerun
  passed. First verify after disabling alarm motion needed the token test to accept CSS none.
- English product name and logo remain future work per the earlier user instruction.

## Latest comparison

- User request: «что изменилось посмотри». Inspection only, after the earlier stop request.
- main, b6a8336; current uncommitted tree includes pipeline.html and the earlier experiments.
- Compared pipeline source and saved final frames with the sculptural experiment. New scene adds
  layered metal/insulation, fittings, supports, textured surfaces, particle fluid, puddle and orbit.
- Visual tradeoff: stronger industrial realism, brighter metal and nearly chrome liquid highlights
  move away from the earlier quiet black object. Main screen is still a separate page.
- Live Chrome inspection was interrupted by unavailable native windows; final visual comparison
  uses work/audits/pipeline/leak-closeup-final.png and leak-dark.jpg. No source changes made.
