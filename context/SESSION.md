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
existing pipe materials. No ML or product API in this stage. Brand decided by the user: duppel
(work/naming.md, docs/brand/, ds/doc-brand.html).

Previous user instructions retained from that session:
User: «давай тогда пробуй и начинай менять дизайн по трубе, брат. делай с помощью субагентов sol 6.1 high fast».
User: «параоллельно работает если что агент который работает полностью с нефтью.»

## Implemented

2026-11-14 user: «удаляем ровно все то, что не нужно по дизайну ... оставил ровно то, что я
последнее тыкал»; «все связанное с dupple оставь , остальное убери». Final design system only:
Основы (index, doc-*, doc-brand), Компоненты (pipe-kit, kit, 404), Экраны (screen-pipe,
scanner/blueprints) and their dependencies (wall/, pipeline/studio.js, textures.js, scanner data).
Removed: archive, leak simulator screens and scenes, experiments, runtime, wall scanner screen and
catalog, directions, icon variants, logo gallery, font/source shots, their audits and specs. All
recoverable from git history before the removal commit. Copy follows the wall case; oil in the
section flows. Plan and history: work/design/consolidation-plan.md, docs/design-decisions.md.

## Verification

Wall browser script (24-view matrix, axe, overflow, nogl, context loss, reduced motion), field unit
tests and a page sweep (375/1440, both themes, no overflow/page errors; axe = 16 pre-existing
findings from 0310a8c). Hardware Chrome section view: frame median 8.3 ms. Details:
work/audits/pipe-style/README.md. Limits: synthetic data only, no model or API.

## Next

Preview http://127.0.0.1:5178/work/design/ds/index.html (server on 5178). Branch feat/redesign-oil.
Open: plan stages 3.3–3.4 (personalities ↔ scales, chart grammar on thickness), stage 4 transfer
to frontend, the 16 old axe findings.
