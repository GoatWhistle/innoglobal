# Component kit: inventory and gaps

Page: `/work/design/ds/kit.html` (parts `kit-part-*.html`, styles `kit-*.css`, scripts `kit-*.js`).
Standalone 404: `/work/design/ds/404.html`. Token proposals: `kit-tokens.css`.

## What existed (2026-11-12)

| Area | State before the kit |
|---|---|
| Button | primary, ghost, quiet, danger, sm, disabled, busy; base class lived in `hero.css` |
| IconButton | one size, no quiet variant, no CloseButton, no CopyButton |
| Fields | text, number with steppers, search, invalid; no hover token, no disabled, readonly, warning, textarea, counter |
| Select | listbox with keyboard, no typeahead, no flip, no meta column, no long-text handling |
| Combobox, Menu, Popover, DateRange | missing |
| Checkbox, Radio, Switch | checked/unchecked only; no indeterminate, hover, disabled, invalid, description |
| Segmented, Tabs, Slider | basic; no keyboard on tabs, no range slider, no disabled |
| Stepper, Disclosure, Breadcrumbs, Pagination, Kbd, Progress, NoValue | missing |
| Tooltip, Toast | basic; no placement flip, no shortcut, no toast variants beyond two, no pause indicator |
| Dialog, Drawer | missing |
| Table | sticky header only; no sorting, selection, row states, empty or loading |
| ScrollArea | global scrollbar only; no fade edges, no horizontal demo |
| States | Empty and Error panels, skeleton block; no timing rules demo |
| Error screens, 404 | missing |
| Icons | 41 symbols; `pipe` read as a hash sign at 16px; no chevron set, sort, copy, external, eye, lock, drag |

## Decisions in the kit

- The legacy `controls.css`, `choice.css`, `states.css`, `layers.css`, `controls.js` stay as they were
  because `index.html` still links them; `kit-*.css` supersede them and map 1:1 to `src/shared/ui`.
- Static matrix states use `.is-hover`, `.is-focus`, `.is-active`, declared next to the real pseudo
  classes, so the matrix and the live control can never drift apart.
- ScrollArea fade edges use `mask-image`; it is a mask, not a visible gradient fill.
- Disclosure animates `clip-path` and opacity only; the following content moves without animation,
  as the motion rules forbid height animation.

## Built (round 3, 2026-11-12)

- Icons: added `flow-stop`, `sensor-off`, `diverge`, `error`, `help`, `server`, `clock`, `refresh`,
  `filter`, `sort`, `sort-asc`, `sort-desc`, `chevron-up`, `chevron-left`, `chevron-up-down`,
  `arrow-left`, `external`, `copy`, `upload`, `edit`, `trash`, `eye`, `eye-off`, `lock`,
  `more-vertical`, `drag`, `menu`. Redrawn: `pipe` (flanged spool, was a hash sign), `leak` (larger
  drop), `pressure` (gauge without base line), `chart`, `journal`, `timer`, `calendar`, `search`,
  `download`, `sensor`, `valve`, `pump`, `temperature`. `reset` means back to the initial state,
  `refresh` means retry or reload.
- Token proposals live in `kit-tokens.css` with both theme values.
- Parts are generated HTML; edit them directly, one section per component.

## Known gaps

- Combobox has no multi-select TagInput; DateRange month arrows are static.
- Matrix hover columns use `.is-hover`, so on touch screens they look like the default column.
- Schema labels in error screens scale with the SVG width.
