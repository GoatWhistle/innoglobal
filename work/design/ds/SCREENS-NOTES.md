# Screen templates: plan and decisions

Index: `/work/design/ds/screens.html`. Each template is a full-viewport page `screen-*.html`,
switched by `?state=<id>`; `?dock=0` hides the template dock for clean screenshots.

All numbers come from one run of `scene/sim.js` (seeded): section 12 000 м, six pressure sensors
every 2 400 м, model 5,00–4,09 МПа, threshold 0,07 МПа, hold 0,4 с, wave 1 050 м/с. Leak inserted
at 6 340 м: wave reaches Д-04 at 0,94 с and Д-03 at 1,59 с, both held, located at 6 341 м ± 42 м
after 2,04 с.

## Shell (every screen)

- Header 64px: wordmark, section nav (Участок, Журнал, Датчики, Модель), line status badge, live
  model indicator with clock, theme switch.
- ≥64rem nav with icon and label; 48–64rem icon only with tooltips; <48rem nav moves to a bottom
  tab bar (4 × 44px+ targets), header keeps mark, status badge, theme.
- Shell states: online, offline (system banner under header, header status "Нет связи 12 с",
  readouts dimmed `stale`), paused model.

## Screens and states

| Screen | File | States |
|---|---|---|
| Участок (twin) | `screen-twin.html` | calm, watch, leak, ack, nogl, offline |
| Утечка № 42 | `screen-incident.html` | new, ack, shut (dialog), closed, false |
| Журнал | `screen-journal.html` | default, loading, empty, error |
| Датчики | `screen-sensors.html` | normal, alarm, silent |
| Модель | `screen-model.html` | clean, edited, warning, error, running |
| Первый запуск, ошибки | `screen-start.html` | first, loading, server, offline, crash |

## Layout per breakpoint

- Twin ≥75rem: stage plus profile on the left, side panel 400px (440px from 120rem) on the right,
  whole screen fits the viewport. 48–75rem: panel collapses under the stage into two columns
  (status | sensors), profile below. <48rem: status first, stage, sensors, profile.
- Incident: main column (timeline chart, event sequence) plus 400px side column (location, actions).
  <64rem one column, actions sticky at the bottom.
- Journal: filter rail 280px plus table ≥75rem; below that a toolbar with a filter drawer; <48rem
  rows become stacked list items.
- Sensors: list 320px plus detail; <48rem list and detail are separate views.
- Model: form in two columns of fieldsets plus a live preview column; action bar sticky at the
  bottom.

## Theme signature

Dark is a night control room; light is an engineering drawing: dimension lines with oblique ticks,
leader callouts, dash-dot centre lines, hatched residual areas. Same markup in both themes; the
difference lives in local tokens (`--sd-*` in `screens-base.css`) that are candidates for
`tokens/`.

## Status, 2026-11-12

Built: shell, `screen-twin.html` (6 states), `screen-incident.html` (5 states),
`screen-journal.html` (4 states), index `screens.html`. Not built: Датчики, Модель, первый запуск
и экраны ошибок (rows stay in the table above as the plan).

Scene pictures for the twin are captured from `scene.html` with a fixed click at 6 330 м
(`shots/screens/scene/`), so the scene, the panel and the charts show the same leak in both themes.
