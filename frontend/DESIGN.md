---
name: "duppel"
description: "A dimensioned wall scanner linking a physical pipe, minimum thickness and inspection evidence"
---

# Design system: duppel

## Authority and entry points

The user chose to develop the current Onest, graphite and paper visual world, retaining the physical
pipe. The original monopo reference is recorded in `work/design/style.md`; the current direction is
the approved wall-scanner plan of 2026-11-14. Old leak-detection pages are experiments.

Pipe-led direction, 2026-11-14 (`work/design/pipe-style-plan.md`): the pipe is the interface.
Main screen: `work/design/ds/screen-pipe.html` (route, unroll, section). Pipe components and the
three-scale foundations: `work/design/ds/pipe-kit.html`. Code: `work/design/ds/wall/`.
Previous single-scale scanner: `work/design/ds/screen-thickness.html`. Subject components and usage:
`work/design/ds/scanner/catalog.html`. Future screen schematics: `scanner/blueprints.html`.
Generic controls and state matrices: `work/design/ds/kit.html`. Foundations: `index.html` and `doc-*`.
Code mapping: `COMPONENTS.md`. All values live in `src/shared/styles/tokens/`.

## Structure and signature

The user moves a cross-section along the pipe. The profile and wall diagram select the same segment.
A scanning ring, measured coordinate, dimension ticks and a nominal-wall outline carry the signature.
These marks encode data or position; buttons do not imitate metal.

Desktop: pipe and coordinate ruler on the left, compact segment inspector on the right, full-width
profile underneath. No dashboard KPI grid. Mobile: segment summary first, then pipe, profile and
expandable evidence. The page scrolls naturally; there is no body scroll lock or nested mobile sheet.

The subject is minimum thickness, not a reconstructed defect map. The wall diagram preserves the
ratio of predicted to nominal thickness within an exaggerated wall ring. Its explanatory caption
is always visible. The 3D pipe is a schematic physical object, not a surveyed route or asset passport.

## Three scales and the mixing rule

One pipe, three camera distances; the selected segment survives every change. Route answers where
the thin places are; unroll answers what shape and size each thinning has; section answers how thin
one point is. Each scale has one leading source and the others stay silent: scene for route,
drawing over metal for unroll, drawing plus one editorial figure for section. Glass is only a matte
panel over WebGL; the instrument source gives only the camera key and segment strip.

Pipe components: tag on a clamp (replaces tooltip), stencil marking (replaces object title and
breadcrumbs; mask-made stencil on Onest, Cyrillic preserved), wall scale, segment strip (slider),
dimension line, camera key (radio group with travel), matte panel, sheet stamp (replaces footer).
The wall scale `--wall-steel` → `--wall-rust` → `--wall-amber` is relative to the thinnest segment
of the selected pipe; it is never a threshold. `wall/tokens.css` holds these proposed tokens until
the React migration moves them into `src/shared/styles/tokens/`.

The unroll keeps the sheet, the segment strip and the profile on one distance axis (36 px left,
18 px right inset). Circumference is labelled in clock hours, 12 at both sheet edges. The angular
distribution is a synthetic rule of the example (loss centred near 6 o'clock), not a VTD map.

## Themes and colour

Components use semantic tokens only; both themes share roles and geometry.

| Role | Tokens | Use |
|---|---|---|
| Ground / panel / float | `--surface-base`, `--surface-raised`, `--surface-float` | warm graphite depths in dark; paper and white in light |
| Recess / selection | `--surface-sunken`, `--surface-selected` | fields, tracks and selected rows |
| Reading hierarchy | `--text-primary`, `--text-secondary`, `--text-muted` | measurements, context and annotations |
| Boundaries | `--border-subtle`, `--border-control`, `--border-ink` | structural separators, controls and selected marks |
| Priority | `--status-warning`, `--text-warning`, `--signal-warning-surface` | relative inspection shortlist, always named |
| Error / criterion | `--status-danger`, `--text-danger` | error or supplied violated criterion, never inferred failure |
| Selection and focus | `--text-primary`, `--focus-ring` | scanner and chart cursor; keyboard focus is distinct |
| Measured / forecast | `--chart-measured`, `--text-secondary` | solid measured line and dashed forecast |
| Interval | `--chart-band`, `--text-muted` | labelled optional P10–P90 fill with a visible boundary |

Neutral does not mean safe. A missing value never becomes zero. The selected segment remains neutral
even when it belongs to the priority list; a separate label supplies the priority meaning.

## Type, form and rhythm

The wordmark `duppel` is Schibsted Grotesk 800 converted to outlines in `docs/brand/`; that font
never sets UI text and Onest never sets the logo. Always lowercase. `--font-accent` (Raleway Italic)
is only for the one-letter swap in the scene headline.

Onest is used throughout. Light weights belong to large headings and dimensioned readouts; regular
to body and annotations; medium to actions. Tabular figures preserve alignment. Raleway remains a
reserved legacy accent and is not introduced into the scanner. Monospace is for code only.

Use the existing semantic type, line-height and spacing scales. Structural areas remain square;
controls use `--radius-control`; overlay radii follow their existing roles. Focus and field outlines
retain their contrast in both themes. Components use the same tokens as React primitives.

Thickness uses millimetres, two decimals in the synthetic example; distance uses metres and integer
segment boundaries. Dates identify the baseline or forecast explicitly. Russian formatting uses
commas and grouped digits. Export formatting is a separate future contract.

## Component behavior

- Pipe selection, range, coordinate input, profile and priority row share one selected segment.
- Hover previews a possible pick. Click or drag selects. Camera orbit requires the explicit mode.
- Previous/next and keyboard selection are immediate. A coordinate at the pipe endpoint selects the
  final segment, including a partial one. Invalid fields retain the current selection and explain
  the accepted range.
- The top ten percent is calculated per pipe from predicted thickness ascending, ties by segment id.
  The rule and rounding up of the segment count are documented alongside the data contract.
- The inspector shows baseline, difference and optional interval. It never claims unseen VTD values.
- The profile leaves missing observations disconnected. A withheld target fact is never drawn.
- Evidence expands inline. Unavailable factors are explicit. Prototype schemas never look actionable.

Generic buttons, fields, segmented controls, tables, overlays and feedback continue to use their
existing kit definitions. The subject catalog adds the scanner, wall section, thickness value,
profile, source/date and priority row; it does not duplicate a generic primitive.

## Motion, resilience and verification

Two tempos: the scene is viscous (unroll 1250 ms, cut 1000 ms, segment change in section 800 ms),
the interface answers in 80–320 ms. Reduced motion makes camera changes instant and shows the sheet
flat. Numbers never tween. Pointer selection follows the input; keyboard selection is immediate. Camera
motion uses the existing rig and honors reduced motion, without automatic drift. Rendering is
requested only when needed and pauses in a hidden document. Frame cost can lower pixel density.

The 2D fallback and coordinate controls work if WebGL or the renderer module is unavailable. The
catalog includes ready, missing, loading, empty, error and no-3D examples. A loading specimen is a
labelled catalog state, not a fabricated network request.

The pipe screen draws route, unroll and section as SVG without WebGL, after context loss or when
the renderer module does not load within six seconds. Review widths 375, 768, 1280 and 1440 in both themes, focus and keyboard order, long labels, missing data,
WebGL context loss and reduced motion. React checks do not cover the HTML example; its browser tests
and screenshots are recorded separately in `work/audits/scanner/`.
