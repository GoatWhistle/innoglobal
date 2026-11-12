# System notes

Owner: design-system lead. Scope: tokens, `global.css`, `index.html` (foundations), `DESIGN.md`,
`PRODUCT.md`. Components live in `kit.html`, the scene in `scene.html`.

## Audit, 2026-11-12

Tokens

- Light theme was the dark theme inverted: page, panel and selected chip all `#ffffff`, so layers
  existed only as hairlines. Text pure `#000` on pure `#fff` (21:1) glared next to the soft scene.
- The ramp was cold digital grey while the oil palette is warm (`--crude-pitch` is a warm black).
  The chrome and the scene belonged to different worlds.
- Light warning used `--amber-700` for dots and outlines: reads as brown dirt, not amber.
- Floating layers had no own surface. In dark a popover over a panel was separated only by the ring,
  the shadow is invisible on black.
- `--shadow-float` was one blurred layer; no contact shadow, so floats looked pasted.
- Line heights drifted off the 4px grid (micro 14px, lead 26px, subheading 26px).
- `global.css` set headings to 600, against the decision "large text whispers at 300".

Page

- Hero scene, controls and states duplicated what the scene and kit pages now own.
- Text described the system instead of showing it; values were typed by hand and could drift.
- No contrast evidence, no copy rules, no accessibility section, light theme never shown next to dark.

## Plan

1. Warm-neutral ink ramp built in OKLCH (hue 88, chroma at most 0.0045): still monochrome, shares
   the hue of crude pitch. White and black stay pure at the ends.
2. Light theme as paper: page `--ink-25`, panels white, tracks `--ink-50`, text `--ink-950`.
   Hairlines 10/22% in light, 11/24% in dark. Brighter `--amber-500` for non-text warning marks.
3. `--surface-float`, `--shadow-near`; two-layer float shadow.
4. Line heights snapped to 4px. Global headings at 400.
5. Page = foundations only, every value read live from tokens, contrast computed live in both
   themes, links to kit and scene.

## Contrast after the change (computed, WCAG 2.x)

Light (page / panel / track): primary 17.6 / 19.0 / 16.7, secondary 7.0 / 7.6 / 6.7, muted
4.9 / 5.3 / 4.7, danger 6.8 / 7.3 / 6.4, warning 6.1 / 6.6 / 5.8. Control outline 3.2 / 3.4 / 3.0.
Dark (page / panel / hover): primary 19.5 / 17.6 / 15.5, secondary 10.3 / 9.3 / 8.1, muted
6.1 / 5.5 / 4.8, danger 8.2 / 7.5 / 6.5, warning 12.0 / 10.8 / 9.5. Control outline 4.0 / 3.6 / 3.1.
The page recomputes the full matrix live (section "Доступность").

## Pass 2, 2026-11-12: foundations for building screens

User: "как под это фронтенд делать не понятно". Then: light theme must not feel secondary
("две личности": dark is the night control room, light is an engineering drawing) and must be more
interesting.

Plan

1. Split the single page into a foundations section of nine pages with one shared shell
   (`doc-shell.js` renders header and table of contents from one manifest). Every page stays under
   250 lines; chapters keep stable ids.
2. New tokens, both themes where they carry colour: layout (`--panel-*`, `--nav-width`,
   `--sheet-peek`, `--columns-*`), density (`--row-height*`, `--cell-padding*`), charts
   (`--chart-*`), drawing (`--drawing-*`, `--hatch-*`, `--fill-*`, `--paper-grid*`,
   `--selection-mark`, `--trace`, `--sheen`, `--ink-weight-*`, `--centerline-dash`, ...).
3. Dual-channel rule: a signature detail is drawn in two layers, an ink layer and a fill layer.
   Light turns ink on (hatch, contour, marks), dark turns fill and sheen on. Components draw both
   and never know the theme.
4. Chapters: build checklist, two personalities and the drawing vocabulary, layout, density,
   numbers, charts, real time, alerts, feedback, forms, tables, navigation and keys, responsive,
   glossary. Each: rules, live specimen from tokens, do and don't, token names.
5. Three screenshot rounds at 1440 and 375 in both themes.

Pages: `index.html` (principles, build, colour, type), `doc-drawing.html`, `doc-base.html` (rhythm,
layers, motion, icons, accessibility), `doc-layout.html`, `doc-data.html`, `doc-charts.html`,
`doc-alerts.html`, `doc-forms.html`, `doc-words.html`.

Status, end of pass 2

- Built: all nine pages; shared shell `doc-shell.js`, `doc-shell.css`, `doc-spec.css/js`; charts
  `doc-chart-kit.js`, `doc-charts.js`; interactive specimens for real time, alert lifecycle, selection.
- Screenshots: `shots/system/r1-*` (first round), `shots/system/final-*` (1440, both themes). The
  375 pass was cut at the user's request to wrap up.
- Not done: 375 screenshot review; dedicated chart specimen for per-sensor time series; light-theme
  drawing details are specimens only, the kit components do not use them yet.
- Conflicts to fix in kit (not owned here): table rows use a 2px coloured inset stripe
  (`kit-table.css`, against no-side-stripe); a leak is shown as a toast in `kit-part-*`.

