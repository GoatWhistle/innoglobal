---
name: "PipeTwin"
description: "Operator console with two personalities, a night control room and an engineering drawing; colour appears only when oil is where it should not be"
---

# Design System: PipeTwin

The interface is ink on paper around one living object, the WebGL pipe with crude flowing inside.
Every screen must make one thing obvious within a second: is the line calm, suspicious or leaking.

Source style, picked by the user: <https://styles.refero.design/style/3e52dd36-6ab1-48c6-bc40-47ef6d33abc2>,
extracted from <https://monopo.vn/>. Full extraction, conflicts and decisions: `work/design/style.md`.
Living reference with values read from the tokens: `work/design/ds/index.html` and the `doc-*.html`
pages (build checklist, two personalities, layout, density, numbers, real time, charts, alerts,
feedback, forms, tables, keys, glossary), `kit.html` (controls and states), `screens.html`
(product screens), `scene.html` (the pipe). Code mapping: `frontend/COMPONENTS.md`.

Values live only in `src/shared/styles/tokens/`. This file names roles, usage and rules and never
copies a hex, px or ms value: change the token, not this file. `npm run tokens:export -- --print`
shows the current values.

## 1. Overview

- **Register:** product UI, an operator console. Density is calm: few numbers, each large and
  tabular, because the jury reads the screen from a distance during the demo.
- **Layout:** full screen width. The scene takes the stage; panels sit on top of or beside it.
  Pages have no `max-width`; padding is `--space-page` and `--space-page-wide` from 75rem. Only prose
  (`--prose-measure`) and a single field (`--field-max-width`) are capped.
- **Breakpoints:** 30, 48, 64, 75, 90 and 120rem, the same values in `matchMedia`.
- **Themes:** two equal personalities of one product, dark by default. Dark is the night control
  room: pitch, depth, glossy oil, a sheen on floating edges. Light is an engineering drawing: paper,
  ink in three weights, hatching, dimension lines, leader callouts, millimetre grid behind work
  areas. Structure, components and meaning are shared; components never know the theme.
- **Language:** Russian only (user decision, `work/design/style.md`, C6).

## 2. Colors

Palette tokens (`--ink-*`, `--leak-*`, `--amber-*`, `--crude-*`) stay inside `tokens/`. Components use
semantic tokens only. Every semantic token exists in both themes.

| Role | Token | Meaning | Where |
| --- | --- | --- | --- |
| Page | `--surface-base` | the ground: paper in light, black in dark | body, scene void |
| Panel | `--surface-raised`, `--surface-raised-hover` | content above the page | panels, rows, cards |
| Track | `--surface-sunken`, `--surface-selected` | recessed track and the chosen item in it | segmented, slider rail |
| Float | `--surface-float` | layers above everything, with `--shadow-float` | popover, menu, dialog, toast |
| Text | `--text-primary`, `--text-secondary`, `--text-muted` | reading, supporting, captions | body, hints, units, timestamps |
| Action | `--action-primary`, `--action-primary-text` | the one main action, in ink | primary pill, selection |
| Lines | `--border-subtle`, `--border-strong`, `--border-control`, `--border-ink` | divider, outline, field edge, emphasis | panels, ghost pill, inputs, rules |
| Focus | `--focus-ring` | keyboard position | shared `:focus-visible` |
| Suspicion | `--status-warning`, `--text-warning`, `--signal-warning-surface` | the model and the sensors drift apart | badge, row, banner |
| Leak | `--status-danger`, `--text-danger`, `--signal-danger-surface`, `--action-danger` | a leak is confirmed | alarm, banner, shut-off action |
| Scene | `--scene-*` | WebGL only: crude sheen, steel, leak | `scene/` |

Rules:

- **Colour means an event.** Ink for everything; amber for suspicion, oxblood for a leak. Normal and
  success stay neutral. `--crude-*` exists for the scene and never fills a control.
- **Light is paper, not inverted dark.** The page is the warm `--ink-25`, panels are white above it,
  tracks sink to `--ink-50`, text is `--ink-950`, not pure black. Layers read by tone and by line.
- **Dark is pitch.** Warm pitch page so the scene's vignette disappears into it, panels a step up,
  floats one more step up because shadows vanish on black.
- **Status is an icon plus text.** Colour reinforces, never carries alone.
- **Contrast:** `npm run rules` (`contrast`) keeps text at 4.5:1 and the focus ring at 3:1 on every
  surface in both themes. The foundations page recomputes the full matrix live, including field
  outlines and signal marks (3:1) and signal text on its own surface.

## 3. Typography

- **Sans:** `--font-sans`, Onest, for every role. Tabular figures verified.
- **Accent:** `--font-accent`, Raleway Italic, only for the one-letter swap in the scene headline and
  in the mark. Never a word, never body.
- **Mono:** `--font-mono` for raw identifiers in developer views only; the UI shows tokens of the
  domain (sensor ids, pipe grades) in Onest.
- **Scale:** `micro`, `caption`, `label`, `body-sm`, `body`, `lead`, `subheading`, `heading`,
  `heading-lg` (fluid), `display` (fluid), `readout`, `readout-sm`. Each has a matching
  `--line-height-*`; fixed sizes land on a 4px line grid.
- **Weights:** `--weight-light` for anything at `lead` size and above and for readouts,
  `--weight-regular` for text, `--weight-medium` for buttons and labels. Nothing heavier above
  `subheading`.
- **Numbers:** `--font-numeric` wherever values line up or tick; formatted with `Intl` (`ru-RU`):
  narrow no-break space in groups and before units, decimal comma.

## 4. Space, shape, elevation

- **Rhythm:** 4px step, `--space-*`. Semantic aliases: `--space-page`, `--space-section`,
  `--space-card`, `--space-element`.
- **Corners:** 0 or pill, nothing between. `--radius-sm`, `--radius-md`, `--radius-lg` are 0 by
  decision and stay as names so primitives keep one vocabulary; `--radius-pill` for buttons, tags,
  switches, tracks; `--radius-round` for dots.
- **Lines before shadows:** a panel is `--surface-raised` with a `--border-subtle` hairline.
  `--shadow-ring` outlines secondary controls, `--shadow-raised` marks the selected segment,
  `--shadow-float` (ring, contact and ambient layers) belongs to floats only.
- **Sizes:** `--control-height` and `--target-min` 44px, `--control-height-compact` only inside
  dense toolbars with an enlarged hit area. Icons `--icon-sm` to `--icon-xl`, stroke `--icon-stroke`.
- **Layers:** `--layer-*` only, from `--layer-raised` to `--layer-skip-link`.

## 5. Motion

Two tempos.

- **UI:** `--ease-out`, `--dur-instant` to `--dur-slow`. Press scales to `--press-scale`; overlays
  fade and scale from `--enter-scale` at the anchor and close faster than they open; content swaps
  through `Swap`; screens change with View Transitions.
- **Scene:** `--ease-viscous` with `--dur-scene` and `--dur-scene-long` for camera, lens and reveal
  (`--motion-reveal`). Rare events only: inserting a leak, confirming it, resetting.
- **Loops:** a static icon for an active leak indicator, `--motion-shimmer` for skeletons,
  `--motion-spin` for spinners.
- Values that tick (pressure, flow, timer) never animate. Reduced motion shrinks durations to 1ms
  and turns movement into a short fade.

## 6. Components

Everything is built from `src/shared/ui`; a screen never writes its own variant of a primitive. The
visual spec for controls and states is `work/design/ds/kit.html`.

- **Button:** pill. `primary` in ink for the one main action, `secondary` with `--shadow-ring`,
  `ghost` in toolbars, `danger` only for shutting off a section.
- **Panel:** square, hairline, `--surface-raised`. No card grids of identical tiles.
- **Readout (signature data component):** label in `caption` muted, value in `readout` light
  tabular, unit in `body-sm` muted, model value beside the measured one. Uses amber or red on the residual and status badge when the detector reports an event.
- **Status:** icon, word and colour together: calm, suspicion, leak, no data.
- **States:** `Skeleton` after 200ms and held 300ms, `Spinner` after 400ms, `stale` dimming,
  `EmptyState` with a 48px icon and the next action, `ErrorState` with "Повторить".

## 7. Do's and Don'ts

### Do:

- Let the scene be the only colourful thing on screen until something happens.
- Put the measured value next to the modelled one; let the difference be the story.
- Write events as facts with a place and a number: "Утечка на 1 240–1 380 м".
- Check 375 and 1440 in both themes before calling a screen done.

### Don't:

- No gradients, glows, glass or gradient text; no emoji; no lucide or other stock icons.
- No radius between 0 and pill; no shadow on panels or buttons.
- No amber or oxblood as decoration, branding or hover.
- No caps-lock labels, no fake 01/02/03 numbering, no coloured side stripe.
- No em dash, middle dot or pipe as a separator; no "Упс", no exclamation marks.
- No colour as the only signal; no text below 4.5:1 in either theme.

## 8. Two personalities

Rule of two layers: a signature detail is drawn as an ink layer and a fill layer. Light switches the
ink on (hatch, contour, marks, trace, paper grid), dark switches the fill and the sheen on. A layer
that is off resolves to `transparent`, so a component draws both and never branches on the theme.
Focus stays one ring, `--focus-ring`, in both themes.

| Detail | Tokens | Where | Never |
| --- | --- | --- | --- |
| Ink weights | `--ink-weight-contour`, `--ink-weight-line`, `--ink-weight-fine`; `--drawing-frame`, `--drawing-contour`, `--drawing-line`, `--drawing-fine` | schemes, title block, leaders, dimension lines | body text, buttons |
| Hatching | `--hatch-neutral`, `--hatch-warning`, `--hatch-danger` over `--fill-warning`, `--fill-danger`; `--hatch-angle`, `--hatch-spacing`, `--hatch-width` | gap above threshold, leak interval, no-data zone | panel background, text |
| Centre line | `--centerline-dash` | pipe axis, zero of the residual | section divider |
| Dimension line, tick | `--dimension-tick`, `--drawing-line` | section length, location error, sensor spacing, list markers | instead of a chart axis |
| Leader callout | `--leader-shelf`, `--drawing-line` | a reading at a place on the pipe or chart, at most three per view | legends |
| Millimetre paper | `--paper-grid`, `--paper-grid-major`, `--paper-cell`, `--paper-cell-major` | plot area, scene, scheme | behind text, panels, dialogs |
| Title block | `--drawing-frame` | screen header with real data: section, scale, parameter revision, last run | cards |
| Selection marks | `--selection-mark`, `--mark-corner` | selected row, sensor, section | focus |
| Hover trace | `--trace`, `--dur-panel` | clickable panels and scheme rows | buttons |
| Sheen | `--sheen`, `--shadow-sheen`, inside `--shadow-float` | floats, sticky action bars | panels |

Hatching in HTML is a pseudo-element filled with the hatch colour and masked with
`repeating-linear-gradient` (gradients are allowed only in `mask-image`); in SVG it is a `<pattern>`
with a unique id per chart, because a pattern takes custom properties from where it is defined.

## 9. Layout, density, data

- **Shell:** sticky header `--header-height` (`--header-height-compact` below 48rem), alarm banner
  under it pushing content down, scene `minmax(0, 1fr)` beside the panel `--panel-width`
  (`--panel-width-wide` from 120rem, `--panel-min` to `--panel-max`). Below 64rem the panel becomes a
  bottom sheet with `--sheet-peek`. The scene screen does not scroll; regions do. Columns
  `--columns-sm`, `--columns-md`, `--columns-lg` (4, 8, 12) with `--grid-gap`.
- **Density:** comfortable by default (`--row-height`, `--control-height`, `--cell-padding`);
  compact (`--row-height-compact`, `--control-height-compact`, `--cell-padding-compact`) only in
  tables with a fine pointer from 64rem, through a `density` prop.
- **Numbers:** pressure and residual in МПа with 2 decimals, residual always signed (`U+2212`), flow
  in м³/ч with 0 decimals from 100, temperature °C with 1, location in м rounded to 10, detection
  time in с with 1. Uncertainty as `6 840 ± 20 м` or "ошибка 20 м"; never more precise than the error.
- **Charts:** measured `--chart-measured` solid `--chart-stroke`, model `--chart-model` dashed
  `--chart-dash-model` at `--chart-stroke-model`, tolerance band `--chart-band`, grid `--chart-grid`,
  axes `--chart-axis`, crosshair `--chart-crosshair`; amber and oxblood (`--chart-warning`,
  `--chart-danger`) only on the segment, point or area of an event. One y-axis, direct labels, no
  animation per tick. Sizes `--chart-height`, `--chart-height-sm`, `--sparkline-width`,
  `--sparkline-height`, `--chart-marker`, `--chart-hit`.
- **Real time:** live, delayed (2 ticks to 10 s), stale (over 10 s, `--opacity-stale`), offline
  (30 s or browser offline, page banner), paused, replay. Readout text at most 4 Hz, charts 10 Hz.
- **Alerts:** calm, watch, leak confirmed (banner `role="alert"`, tab title, favicon dot, optional
  sound), accepted, resolved, false alarm. A leak is never a toast.

The Segmented selection uses a background on the selected option itself. A separate moving sibling
can cross underneath an unselected label and break its contrast; selection feedback is immediate.
