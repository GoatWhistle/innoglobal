# Screen templates: plan and decisions

Index: `/work/design/ds/screens.html`. Each template is a full-viewport page `screen-*.html`,
switched by `?state=<id>`; `?dock=0` hides the template dock for clean screenshots.

All numbers come from one run of `scene/sim.js` (seeded): section 12 000 м, six pressure sensors
every 2 400 м, model 5,00–4,09 МПа, threshold 0,07 МПа, hold (выдержка) 0,4 с, wave 1 050 м/с.
Leak inserted at 6 330 м: wave reaches Д-04 at 0,94 с and Д-03 at 1,59 с, both held, located at
6 341 м ± 42 м after 2,04 с. UI shows locations rounded to 10 м and the spread rounded up to 10 м:
"6 340 м ± 50 м, 2,0 с". Pressure is always МПа; бар appears only as an optional unit in the kit.

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
- Sensors: list (min 320px, up to 26rem) plus detail; <64rem the list sits above the detail.
- Model: form column `--sd-panel` with a sticky action bar plus a sticky live preview; <64rem the
  preview goes under the form; <48rem the action bar stops being sticky so it does not cover fields.

## Theme signature

Dark is a night control room; light is an engineering drawing: dimension lines with oblique ticks,
leader callouts, dash-dot centre lines, hatched residual areas. Same markup in both themes; the
difference lives in local tokens (`--sd-*` in `screens-base.css`) that are candidates for
`tokens/`.

## Status, 2026-11-13

Built: shell, `screen-twin.html`, `screen-incident.html`, `screen-journal.html`,
`screen-sensors.html` (3 states), `screen-model.html` (5 states), index `screens.html`. Not built:
первый запуск и экраны ошибок (row stays in the table above as the plan).

- Twin renders the realistic pipe from `pipeline/engine.js` in both themes (`runtime/scene-view.js`);
  the SVG scheme is the fallback for `?state=nogl`, failed WebGL and lost context. "Вернуть вид"
  resets the orbit; the old flat scene and its labels are gone.
- Sensors uses a seeded `createSession()` run: 60 с calm, or 22 с calm plus 8 с after a leak at
  6 330 м. Silence of Д-06 is a template overlay: the simulator never switches a sensor off. The
  ± 1 200 м accuracy in the silence banner is the single-sided spread from `locate()`.
- Model previews with the real code: `buildModel(params)` and `createSim(random, { wave, threshold,
  hold, params })` re-run the leak at 6 330 м on every valid edit. Model noise 0,011 МПа is the
  largest calm residual over 30 с; the warning fires when the threshold is under three times that.
- Header calm label is "Утечек нет" everywhere, matching the status panel; "Норма" stays for a
  single sensor. Hold time is "выдержка" everywhere (was mixed with "удержание").
- Dock "Из чего собрано" sits bottom right; under 48rem it collapses to an icon button.
