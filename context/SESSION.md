# Session state

Updated: 2026-11-15, MSK

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

2026-11-14 user: «work/audits/full-product/progress-review.md добей цель до конца друг».
Complete product scope supersedes the design-only phase. RU only, both themes, duppel, Onest.
Branch feat/redesign-oil, HEAD 1ef235d; product implementation is uncommitted in the shared tree.

Previous user instructions retained:
User: «давай тогда пробуй и начинай менять дизайн по трубе, брат. делай с помощью субагентов sol 6.1 high fast».
User: «параоллельно работает если что агент который работает полностью с нефтью.»
User: «удаляем ровно все то, что не нужно по дизайну ... оставил ровно то, что я последнее тыкал»; «все связанное с dupple оставь , остальное убери».
User: «спулллься полностью , подтяни в мою ветку другую ветку (ml-pipetwin-merge-case-2) и как бы я хочу чтобы у меня появились данные».
User: «так ну давай промт агенту чтобы построилась полностью наша система по реальным данным и был построен полностью сайт по нашему кейсу, не просто дизайн система а прям готовый фронтенд . сделай это в план и положи в md доку».

## Implemented

DuckDB/CSV read repository, domain snapshot validation and inspection ranking, FastAPI API,
React overview/workspace/priorities/data/model routes, real route geometry, SVG section,
keyboard segment selection and URL range, exports and retryable errors. Selected pipe persists
within the browser session. Compose mounts sources read-only and checks readiness. No paid keys,
no training on startup. Model forecasts 525 + 1475 segments; no withheld target observations.
Source merge 251a5ab, imported ML tip f3d7a42. Full plan: work/full-product-plan.md.

## Verification

Frontend verify: 36 rules, types, lint, 366 tests, build passed. Backend ruff, formatting, mypy,
128 unit/integration tests passed. Compose build and start passed; Chromium through production
nginx: 9 e2e passed, 375/1440 both themes, axe, API outage/retry, reduced motion, WebGL unavailable,
selection and exports. Zoom/reset, sort and kilometre filter checked separately. Export byte-equal
to source. 28 screenshots and logs: work/audits/full-product/. Main URL http://localhost:18080;
backend port 18010. Local dev servers also use 5179 and 8000.

## Limits and next

Historical metrics are imported, not retrained. Target VTD is withheld. P10/P90 coverage is not
calibrated. 1245/1475 case2 predictions equal 3.469 mm, not all predictions; ties use segment ID.
The real product uses SVG schematic geometry and does not reproduce synthetic circumferential pits.
No physical touch-device or cross-browser certification. Product docs describe current behavior.
Setup has activated repository hooks; use the configured human Git identity for commits.

## Completion audit

Original five progress-review findings and the full-product acceptance checklist are verified.
Historical comparison now joins chart_data.json to train_dataset.csv only after checking all
observed values, unique keys, pipe IDs and split dates. Case1 exposes 55 pairs as a separate
saved run, computed r2=.3434524851 and MAE=.3506181818; this is not selected-model r2=.5011.
Case2 returns source_mismatch and no points because its archived observations do not agree.
UI provides scatter/table and an honest unavailable state. No training or source replacement.

Final verification: frontend 366 tests plus rules/types/lint/build; backend 128 tests,
ruff/format/mypy; 9 Compose browser scenarios including scatter/table and immediate contrast.
Segmented colour changes are immediate; only scale animates. Reports and proofs are in
work/audits/full-product/progress-review.md and completion-checklist.md.
Remaining limits are data/calibration and physical-device/browser coverage, not unfinished controls.
Local stack remains at http://localhost:18080, API 18010. No commit, push or deployment performed.

## Publication

2026-11-15 user: «запушь все это дело».
Publish all completed product, documentation and audit changes to origin/feat/redesign-oil.
Publication is based on HEAD 1ef235d, branch feat/redesign-oil; final commit SHA is in Git history.
Frontend verify, backend 128 tests and Compose 9 e2e are green. Hooks are enabled; no force push,
no agent attribution and no deployment. Before new work inspect git status and the remote branch.
