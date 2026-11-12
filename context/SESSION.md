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

## Current state

- Task: design system for the PipeTwin case (brief/TASK.md), then English name and logo
- Branch and revision: main, 9f5f368 (uncommitted design work)
- Stand: template only, nothing product-specific runs yet

## How to continue

Design system v3 (serve repo root on 5178, /work/design/ds/): foundations split into 9 doc pages
(index, doc-drawing, doc-layout, doc-data, doc-charts, doc-alerts, doc-forms, doc-words, doc-base),
kit.html, 404.html, scene.html (dark = glossy 3D, light = engineering drawing on Canvas2D),
screens.html (shell, twin, incident, journal). React primitives in frontend/src/shared/ui per
frontend/COMPONENTS.md; icons via `npm run icons:sync`. Verify green (36 rules, 316 tests).
Open: screens Sensors/Model/first run; token requests from the React agent (icon-stroke-xl,
check-stroke, window-typeahead, badge heights); sound and hotkeys need user approval; then English
name and logo.

## Pitfalls already hit

{{Unresolved pitfalls with evidence pointers.}}

## Left, in order

1. {{next item}}

## Red checks

{{Failing command and result, or none.}}
