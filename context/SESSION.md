# Session state

Updated: 2026-11-14, MSK

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
- 2026-11-13: «давай попробуй еще раз сделать и доделать дизайн систему».
- 2026-11-14: «work/design/pipe-style-plan.md короче вот еще дизайн , твоя цель его сделать».

## Current task

2026-11-14: implement the approved wall-scanner design-system plan, in feat/redesign-oil at 0310a8c.
User: «Implement the plan.» Decisions: «Система и главный экран», «Развить нынешний стиль»,
«Сканер стенки», «В текущем HTML-каталоге», «Синтетический пример».
The new source is brief/sources/pipeline-degradation.pdf: thickness prediction per 10 m segment,
not live leak detection. Preserve old simulator as an experiment. RU only, both themes, Onest,
existing pipe materials. No ML or product API in this stage. Brand/naming is a separate stream;
existing untracked work/brand/ and work/naming.md must not be edited.

Prior session detail and visual-check limitations: work/design/session-before-scanner.md.
Previous user instructions retained from that session:
User: «давай тогда пробуй и начинай менять дизайн по трубе, брат. делай с помощью субагентов sol 6.1 high fast».
User: «параоллельно работает если что агент который работает полностью с нефтью.»

## Implemented

Wall scanner: work/design/ds/screen-thickness.html. One selection links the 3D pipe, dimensioned
wall section, longitudinal profile, coordinate input and top-10% list. Both synthetic cases,
partial final segment, keyboard, missing/loading/empty/error specimens and independent 2D fallback.
Subject catalog: scanner/catalog.html; future screen schemes: scanner/blueprints.html. Existing
foundations and generic kit linked to the new case; calendar and mobile overflow corrected.
New PDF and extracted task preserved; old brief moved to brief/pipetwin-original.md.
Product/design/component docs and glossary aligned. No scanner backend or trained model claimed.

## Verification

2026-11-14: frontend verify passed (36 rules, TypeScript, Biome, 316 tests, build), 4 React e2e
passed, 32 geometry/pipeline/session/scanner Node tests passed. HTML browser scenarios passed:
selection, focus, states, real WebGL loss, absent renderer module, reduced motion, theme changes.
Axe and overflow passed for scanner 375/1280/1440 and catalog/schemes 375/1440, both themes.
Initial Node module resolution and kit mobile overflow failures recovered; audit keeps the details.
One detector pass returned []. A fresh visual review requested a clearer interval boundary in
light theme and the audit index; both fixed and recaptured. Final visual verdict: ship for the two
scored fixes. Fresh documentation pass found no mismatch between built scanner and DESIGN/COMPONENTS.

Evidence and limitations: work/audits/scanner/README.md. Software SwiftShader frame P95 was 100 ms,
CPU render 0.4 ms; 2D control 16.8 ms. Hardware GPU smoothness unverified. Existing PostCSS `from`
warning and absent backend health remain. No real data/model quality validation in this scope.

## Next

Implementation and review complete. Preview: http://127.0.0.1:5178/work/design/ds/screen-thickness.html.
Static server already runs on 5178. No commit/push performed for this implementation. Real data/API,
React migration and ML are separate next stages. Branch remains feat/redesign-oil, HEAD 0310a8c.
2026-11-14: user paused naming/logo; four style directions in work/design/directions/ were merged
by work/design/pipe-style-plan.md. That plan is now implemented (not committed): screen
ds/screen-pipe.html (route → unroll shader → section cut, one selection), catalog ds/pipe-kit.html
(8 pipe components, three-scale foundations), code ds/wall/, foundations chapter in ds/index.html,
docs in frontend/DESIGN.md, COMPONENTS.md §8, docs/design-decisions.md. Checks passed: wall browser
script (24-view matrix 375/768/1440 both themes, axe, overflow, nogl, context loss, reduced motion),
field unit tests, frontend verify. Limits: SwiftShader timing only, 1920 not automated, synthetic
circumferential rule. Details: work/audits/pipe-style/README.md. Next: user review of the live unroll.
2026-11-14: user: «сделай мне щас план в md доку и пропиши что нужно изменить и итоговый дизайн
мне нужно потыкать». Plan work/design/consolidation-plan.md, stages 1–2 done (not committed):
shared nav ds/site-nav.{js,css}, archive ds/archive.html, copy rewritten to wall case, «Сигналы»
and «Свежесть данных». Checks: wall browser script, field tests, 14-page sweep (no overflow/errors;
axe = same 16 pre-existing as 0310a8c). Next: user review; plan stages 3.3–3.4 and 4.
