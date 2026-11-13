# Components: engineering handoff

How to turn the design kit into screens. The visual reference is `work/design/ds/kit.html`
(markup and CSS per state); token meaning lives in `DESIGN.md`; hard rules live in `AGENTS.md`.
This file maps every kit component to React and says what is built.

Import everything from `@/shared/ui`. Never import a component file directly from a feature.

Status: **built** (in `src/shared/ui`, tested) or **spec** (props agreed here, not built yet; build
it exactly to this contract before a second screen needs it).

## 1. Build a screen in six steps

1. **Spec.** `work/screens/<screen>.md`: task, states (loading, empty, error, stale), panels.
2. **Page** `src/pages/<screen>/<screen>-page.tsx`: calls `useDocumentTitle`, lays out panels with a
   CSS grid (`minmax()` + `fr`, no `max-width`), places features into slots. No logic, no fetch.
3. **Entities** `src/entities/<thing>/`: `<thing>.queries.ts` (TanStack Query over `shared/api`)
   and display components (`SensorRow`, `Readout`). Status is `Record<Status, MessageKey>`.
4. **Features** `src/features/<action>/`: user scenarios (insert leak, shut valve). Mutations,
   confirm dialog, toast on success. Wired to entities through props.
5. **Shared UI only.** Every control, state and overlay comes from the table below. A styled
   `<button>`, raw `<svg>`, native `<select>` or checkbox in a feature fails `consistency`.
6. **States and checks.** Loading through `useLoadingIndicator` (`Skeleton` after 200 ms, `Spinner`
   after 400 ms, `stale` dimming), error through `ErrorState` with retry, empty through
   `EmptyState`. Then `npm run verify` and `npm run shots`.

Text: every string from `shared/i18n/locales/{ru,en}/<ns>.json`, RU first, EN keys in sync.
Numbers: `useFormatters()` (`number`, `integer`, `percent`, `time`). Icons: `IconName` union.

## 2. Layout primitives

| Need | Use |
|---|---|
| App shell, header | `app/root-layout`, `app/app-header` (already wired; skip link, route focus) |
| Page title row | `PageHeader` `{ title, eyebrow?, description?, actions? }` |
| Panel with title | `Card` `{ title?, eyebrow?, description?, actions?, as?, motionIndex? }` |
| Panels side by side | page CSS grid: `grid-template-columns: minmax(var(--panel-min), 1fr) minmax(0, 3fr)` |
| Stack inside a panel | `display: grid; gap: var(--space-element)` in the feature module |
| Sections of one object | `Tabs` with the panel content as children |
| Two to five modes | `Segmented` |
| Floating anything | `FloatingLayer` inside `LayerHost` (already in `app/providers.tsx`) |

Gutters `--space-page` / `--space-page-wide`, sections `--space-section`, cards `--space-card`.

## 3. Component reference

Props are `readonly`; optional props accept `undefined`. Variants are `Record<Variant, string>`.
Motion column names the token or primitive; nothing else may animate.

### Actions

| Component | Path | Status |
|---|---|---|
| Button, ButtonLink | `primitives/button/` | built |
| IconButton | `primitives/icon-button/` | built |
| CloseButton | `primitives/close-button/` | built |
| CopyButton | `primitives/copy-button/` | spec |
| Kbd | `primitives/kbd/` | built |

**Button** `{ variant?: "primary" | "secondary" | "quiet" | "danger"; size?: "regular" | "compact";
icon?: IconName; pending?: boolean; type?: "button" | "submit"; ...button attrs }`.
States: hover (`(hover: hover)` only), `:active` scale `--press-scale`, `:focus-visible` global
ring, `disabled`, `pending` (sets `aria-busy` and `aria-disabled`, ignores clicks, spinner replaces
the 18 px icon so width stays; without an icon the label fades and a spinner overlays it).
Tokens: `--action-primary*`, `--action-danger*`, `--action-ghost-*`, `--border-ink`,
`--control-height(-compact)`, `--icon-control`. One `primary` per view; `danger` only to shut off.
`ButtonLink` has the same look, navigates with `viewTransition`.

**IconButton** `{ icon; label; variant?: "quiet" | "secondary"; size?; shortcut?; pending?;
pressed? }`. `label` becomes `aria-label` and the tooltip; `shortcut` adds a `Kbd` to the tooltip
and `aria-describedby`. `pressed` makes it a toggle (`aria-pressed`). Compact keeps a 44 px hit area.

**CloseButton** `{ label?; size?; onClick }`: the only place an `x` icon may appear. Default label
`common:action.close`.

**CopyButton** (spec) `{ value: string; label: string }`: copies, swaps `copy` for `check` in place
for `--timeout-toast`, announces through `aria-live`.

### Status and values

| Component | Path | Status |
|---|---|---|
| Icon | `primitives/icon/` | built |
| BrandMark (symbol, lockup; states identity, calm, alarm, busy) | `brand/brand-mark/` | built |
| StatusBadge | `data-display/status-badge/` | built |
| NoValue | `primitives/no-value/` | built |
| Tag, Chip (filter) | `data-display/tag/` | spec |
| Stat / Readout | `data-display/readout/` | spec |
| Progress | `states/progress/` | spec |

**Icon** `{ name: IconName; size?: "sm" | "control" | "md" | "lg" | "xl"; label? }` (16/18/20/24/48).
Decorative (`aria-hidden`) unless `label` is set, then `role="img"`. Glyphs are generated, see
section 5.

**StatusBadge** `{ tone: "normal" | "warning" | "danger" | "muted" | "off" | "pending"; label;
icon?; size?: "regular" | "compact"; live? }`. Icon map: normal `check`, warning `warning`, danger
`alarm` (pulses with `--motion-alarm`), muted `sensor-off` dashed, off `shut`, pending spinner.
Colour only on warning and danger. `live` adds `role="status"`; leave it off inside tables.

**NoValue** `{ label?; text?; reason? }`: the word "нет данных" instead of a dash; `reason` adds a
dotted underline and a focusable tooltip.

**Readout** (spec, signature component) `{ label; value: number | null; unit; model?: number;
fractionDigits; status?: StatusTone }`: caption label, `readout` light tabular value, `body-sm`
unit, model value beside it, `StatusBadge` next to it; never recolour the number; no motion on tick.

**Tag** (spec) `{ label; icon?; onRemove?; pressed?; onToggle? }`: 28 px pill; removable uses
`CloseButton` compact; filter chip is a toggle with `aria-pressed`.

**Progress** (spec) `{ label; value?: number }`: 2 px track, `scaleX` fill, indeterminate with
`--motion-indeterminate`, `role="progressbar"`.

### Fields

| Component | Path | Status |
|---|---|---|
| TextField | `forms/text-field/` | built |
| NumberField | `forms/number-field/` | built |
| Field frame, input box | `forms/field/` | built (internal) |
| SearchField | `forms/search-field/` | spec |
| TextArea | `forms/text-area/` | spec |
| Form error summary | `forms/error-summary/` | spec |

Shared field props: `{ label; hint?; error?; warning?; optional?; disabled?; readOnly? }`. The
message priority is error, warning, hint; error sets `aria-invalid`, the message is linked with
`aria-describedby`. States: hover border `--border-control-hover`, focus `--border-ink` plus
`--shadow-raised`, error/warning border, read-only dashed with a `lock` prefix, disabled filled.
Max width `--field-max-width`. Validate on submit, not while typing.

**TextField** `{ ...field; type?: "text" | "email" | "password" | "search" | "tel" | "url"; icon?;
unit?; ...input attrs }`.

**NumberField** `{ ...field; value: number | null; onChange(value | null); min?; max?; step?;
largeStep?; fractionDigits?; unit?; placeholder?; name? }`. Text input with `role="spinbutton"`,
`inputMode="decimal"`, no native spinners. Keys: Up/Down step, Shift or PageUp/PageDown x10,
Home/End to bounds, Enter commits. Accepts comma or dot, commits on blur, clamps, formats with
`Intl` (`6,42`). Minus/plus buttons are `tabIndex=-1` and disable at the bounds. Unit sits inside.

### Choice

| Component | Path | Status |
|---|---|---|
| Checkbox | `forms/checkbox/` | built |
| Switch | `forms/switch/` | built |
| Segmented | `forms/segmented/` | built |
| Select | `forms/select/` | built |
| RadioGroup | `forms/radio-group/` | spec |
| Slider, Range | `forms/slider/` | spec |
| Combobox, TagInput | `forms/combobox/` | spec |
| DateRange | `forms/date-range/` | spec |

**Checkbox** `{ label; checked; onChange(checked); indeterminate?; description?; invalid?;
disabled?; hideLabel? }`. Tick draws with `stroke-dashoffset` (`--dur-base`), minus for mixed,
press scale on the box, 44 px row.

**Switch** `{ label; checked; onChange; description?; pending?; disabled?; hideLabel? }`. Applies
at once; `pending` spins inside the thumb and ignores toggles until the server confirms. Thumb moves
with `transform`.

**Segmented** `{ label; options: { value; label; icon?; short? }[]; value; onChange; display?:
"label" | "icon" | "short" }`. Native radios, so arrows work; the selected option paints its own background inside a
framed control. Selection is immediate so moving ink cannot reduce label contrast. Two to five options; icon-only keeps the label for readers.

**Select** `{ label; options: { value; label; meta?; icon?; disabled? }[]; value: T | null;
onChange; placeholder?; ...field }`. Trigger is a button with `aria-haspopup="listbox"`; list is a
`FloatingLayer` with `aria-activedescendant`. Keys: Down/Up/Enter/Space open; arrows wrap,
Home/End, typeahead by first letters, Enter/Space choose, Esc closes and returns focus, Tab closes.
Outside pointer closes. Flips above when there is no room. Motion: fade, scale `--enter-scale`,
4 px shift from the anchor, exit `--dur-fast-exit`.

**RadioGroup** (spec) `{ label; options; value; onChange }`: fieldset of native radios, dot with
opacity and scale.

**Slider** (spec) `{ label; min; max; step; value | [from, to]; unit }`: native range inputs styled,
value in tabular digits, arrows step.

### Navigation and structure

| Component | Path | Status |
|---|---|---|
| Tabs | `layout/tabs/` | built |
| Card, PageHeader | `layout/card/`, `layout/page-header/` | built |
| Stepper | `layout/stepper/` | spec |
| Disclosure | `layout/disclosure/` | spec |
| Breadcrumbs | `layout/breadcrumbs/` | spec |
| Table, Pagination | `data-display/table/` | spec |
| ScrollArea | `layout/scroll-area/` | spec |

**Tabs** `{ label; items: { value; label; icon?; count?; alarm?; disabled? }[]; value; onChange;
children? }`. Roving tabindex, Left/Right wrap, Home/End, disabled skipped, automatic activation.
Underline slides with `useSlidingIndicator`. Count is red only with `alarm`. Children render in
the `tabpanel`.

**Table** (spec) `{ columns: { key; label; align?: "start" | "end"; sortable? }[]; rows; sort?;
onSort?; rowStatus?(row) }`: sticky header, numbers end-aligned and tabular, sort through
`aria-sort` and `sort-asc`/`sort-desc` icons, alarm row gets a `StatusBadge` (no side stripe), empty
and loading rows use `EmptyState` and `Skeleton`, wraps in `ScrollArea`.

**Disclosure** (spec) `{ title; open?; onOpenChange?; children }`: button with `aria-expanded`,
panel animates `clip-path` and opacity, reverse from the current frame.

### Overlays

| Component | Path | Status |
|---|---|---|
| LayerHost, LayerPortal | `overlays/layer-host/` | built |
| FloatingLayer | `overlays/floating-layer/` | built |
| Tooltip | `overlays/tooltip/` | built |
| ToastProvider, useToast | `overlays/toast/` | built |
| Menu | `overlays/menu/` | spec |
| Popover | `overlays/popover/` | spec |
| Dialog | `overlays/dialog/` | spec |
| Drawer | `overlays/drawer/` | spec |

**FloatingLayer** `{ anchor: RefObject; open; align?: "start" | "center" | "end"; prefer?: "top" |
"bottom"; gapToken?; matchWidth?; instant?; layerRef?; ...div attrs }`. Portals into `LayerHost`,
places with `placeLayer` (flip, clamp to an 8 px edge), animates with `@starting-style`, unmounts
through `usePresence`. Menu, Popover and Combobox build on it.

**Tooltip** `{ content; shortcut?; focusable? }` wraps inline content; `useTooltip()` +
`TooltipLayer` for custom triggers. Opens after `--delay-tooltip`, the next one within
`--window-tooltip-skip` opens without animation, shows at once on keyboard focus, Esc and scroll
hide it, ignored for touch.

**Toast**: `const toast = useToast(); toast.show({ tone?: "neutral" | "warning" | "danger"; icon?;
title; text?; action?: { label; icon?; onClick } })`. Bottom right (full width under 48rem), at
most three, oldest leaves first. Danger is `role="alert"` and stays `--timeout-toast-error`, others
`--timeout-toast`; hover or focus pauses the countdown. Enter `--motion-toast-in`, exit
`--motion-toast-out`.

**Dialog** (spec) `{ open; onClose; title; description?; actions; tone?: "danger" }`: native
`<dialog>` inside shared code only, backdrop fades, panel scales from `--enter-scale`, focus on the
title, Esc closes, `overscroll-behavior: contain`. Destructive confirm puts `danger` Button last.

**Menu** (spec) `{ trigger; items: { label; icon?; tone?: "danger"; disabled?; onSelect }[] }`:
`role="menu"`, roving focus, typeahead, danger items last after a separator.

### States

| Component | Path | Status |
|---|---|---|
| Spinner | `states/spinner/` | built |
| Skeleton | `states/skeleton/` | built |
| StatePanel | `states/state-panel/` | built |
| EmptyState | `states/empty-state/` | built |
| ErrorState | `states/error-state/` | built |
| Banner | `states/banner/` | built |
| Error screens (server, offline, WebGL, crash) | `features/*` from `ErrorState` | spec |

**Spinner** `{ label?; size?: "sm" | "control" | "lg" }`: border ring with `--motion-spin`; with a
label it is `role="status"` (label shown under reduced motion), without one it is decorative.

**Skeleton** `{ shape?: "line" | "block" | "readout"; lines? }`: square bones, `--motion-shimmer`,
`aria-hidden`; the wrapper carries `role="status"` and a label.

**EmptyState** `{ icon; title; description?; action? }` and **ErrorState** `{ title; description?;
meta?; icon? = "error"; tone? = "danger" | "neutral"; onRetry?; retryPending?; retryLabel?;
extraAction? }`: left-aligned panel, 48 px icon, one action. Error is `role="alert"`, retry is a
primary Button with `refresh`. Say what happened, what is kept, what to do.

**Banner** `{ tone: "info" | "warning" | "danger" | "system"; title; children?; icon?; actions?;
onDismiss?; edgeToEdge? }`: in the page flow; danger is `role="alert"` with a pulsing `alarm`;
system is inverted for connection and server messages.

### Drawing primitives (light theme personality)

All **spec**. SVG components in `data-display/drawing/`, stroke widths from `--ink-weight-*`,
colours from semantic tokens only, `aria-hidden` unless they carry a value (then the value is also
in text nearby). They render in both themes; light reads as an engineering drawing.

| Component | Props | Notes |
|---|---|---|
| DimensionLine | `{ from: Point; to: Point; label: string; ticks?: "arrow" \| "slash"; offset? }` | extension lines, `--dimension-tick`, label centred on the line in `caption` tabular |
| Callout (Leader) | `{ anchor: Point; label: ReactNode; side: "left" \| "right"; shelf? }` | dot at the anchor, leader then a `--leader-shelf` shelf, label after it |
| HatchFill | `{ id: string; angle? ; spacing? }` | `<pattern>` with `--hatch-angle`, `--hatch-spacing`, `--hatch-width`; for residual areas and sections |
| CenterLine | `{ from: Point; to: Point }` | dash `--centerline-dash`, `--ink-weight-fine` |

## 4. Recipes

**Live readout with delta.** Entity component, values from the query. Value: `number(value, 2)`
in a `tabular-nums` span, no animation per tick. Delta: `number(measured - model, 2)` with sign via
`Intl` `signDisplay`, plus `StatusBadge tone={status}` from `Record<Status, MessageKey>`. Missing
value: `NoValue reason={t(...)}`.

**Sensor row.** `Icon name="sensor"` + id text + readout + `StatusBadge size="compact"` +
`IconButton icon="more-vertical" label=...`. Silent sensor: `StatusBadge tone="muted"` with seconds
silent; never hide the row.

**Alert banner.** `<Banner tone="danger" title={t("leak.title", { from, to })} actions={<Button
variant="danger" size="compact" icon="map-pin">...</Button>}>{details}</Banner>` at the top of
the panel; the same event also raises a `toast.show({ tone: "danger", ... })` once.

**Confirm destructive action.** Until `Dialog` is built: inline two-step inside the panel, first
`Button variant="secondary" icon="shut"`, then `Banner tone="warning"` with consequences in numbers
and `Button variant="danger" pending={mutation.isPending}`; on success `toast.show` with `check`.

**Form with units.** `NumberField label unit="бар" min max step fractionDigits` for each
parameter, `Select` for enumerations, `Switch` for instant toggles; submit `Button type="submit"
pending`; errors from the API go to `error` of the field by key, never the backend message.

**Table with sorting.** Until `Table` is built, keep the column/sort state in the feature,
render rows from the query, sort icons `sort`, `sort-asc`, `sort-desc` inside header buttons with
`aria-sort` on the `th`; numbers end-aligned.

## 5. Icons

- Source: `work/design/ds/icons.svg` (design). Copy kept in `public/icons.svg` (also usable as a
  sprite).
- `npm run icons:sync` copies the design sprite (when present), validates it (only `path` and
  `circle`, kebab-case ids, no fills) and writes `primitives/icon/glyphs.gen.ts` with `GLYPHS` and
  the `IconName` union. `-- --from <file>` imports another sprite.
- `tests/scripts/iconGlyphs.test.ts` fails when the generated file drifts from `public/icons.svg`.
- One concept, one name: `refresh` retries, `reset` returns to the start, `x` only in CloseButton.
- `lucide-react` is no longer imported anywhere; the dependency can be removed by the owner.

## 6. Do not

- Write a `<button>`, `<select>`, `<input type=checkbox|radio|number>`, `<details>` or `<svg>` in
  features, entities or pages.
- Put colour on a number, use colour as the only signal, or add a coloured side stripe.
- Animate ticking values, `width`/`height`, or anything outside `shared/motion` and `--motion-*`.
- Use literal px for spacing, any literal colour, ms or curve; use the semantic tokens.
- Cap page width; only prose (`--prose-measure`) and single fields (`--field-max-width`).
- Write text in JSX or tests; write `—`, `·`, `|` or arrows as separators or icons.
- Show a backend `message`, a "Loading…" text, or an error without a retry.
- Add a UI kit, animation library or icon package.
