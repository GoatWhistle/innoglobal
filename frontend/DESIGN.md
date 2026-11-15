---
name: "duppel"
description: "A dimensioned wall scanner linking a physical pipe, minimum thickness and inspection evidence"
---

# Design system: duppel

## Authority and entry points

The user chose to develop the current Onest, graphite and paper visual world, retaining the physical
pipe. The original monopo reference is recorded in `work/design/style.md`; the current direction is
the pipe-led system of 2026-11-14. Old leak-detection pages were removed from the system.

Pipe-led direction, 2026-11-14 (`work/design/pipe-style-plan.md`): the pipe is the interface.
Main screen: `work/design/ds/screen-pipe.html` (route, unroll, section). Pipe components and the
three-scale foundations: `work/design/ds/pipe-kit.html`. Code: `work/design/ds/wall/`.
Future screen schematics: `work/design/ds/scanner/blueprints.html`. Brand mark: `doc-brand.html`.
Generic controls and state matrices: `work/design/ds/kit.html`. Foundations: `index.html` and `doc-*`.
Code mapping: `COMPONENTS.md`. All values live in `src/shared/styles/tokens/`.

## Structure and signature

The user moves a cross-section along the pipe. The profile and wall diagram select the same segment.
A scanning ring, measured coordinate, dimension ticks and a nominal-wall outline carry the signature.
These marks encode data or position; buttons do not imitate metal.

Desktop: physical scene with projected tag and adjacent selected facts, segment strip, coordinate
controls and profile, then a dimensioned drawing sheet with stamp and inspection shortlist.
Mobile keeps this reading order and stacks the evidence. The page scrolls naturally; there is no body scroll lock or nested mobile sheet.

The subject is minimum thickness, not a reconstructed defect map. The wall diagram preserves the
ratio of predicted to nominal thickness within an exaggerated wall ring. Its explanatory caption
is always visible. The 3D pipe is a schematic physical object, not a surveyed route or asset passport.

## Three scales and the mixing rule

One pipe, three camera distances; the selected segment survives every change. Route answers where
the thin places are; unroll shows an illustrative circumferential distribution and selects a segment; section answers how thin
one point is. Each scale has one leading source and the others stay silent: scene for route,
drawing over metal for unroll, drawing plus one editorial figure for section. Glass is only a matte
panel over WebGL; the instrument source gives only the camera key and segment strip.

Pipe components: tag on a clamp (replaces tooltip), stencil marking (replaces object title and
breadcrumbs; mask-made stencil on Onest, Cyrillic preserved), wall scale, segment strip (slider),
dimension line, camera key (radio group with travel), matte panel, sheet stamp (replaces footer).
The wall scale `--wall-steel` → `--wall-rust` → `--wall-amber` is relative to the thinnest segment
of the selected pipe; it is never a threshold. The production tokens live in `src/shared/styles/tokens/`; the original catalog remains intact.

The unroll keeps the sheet, the segment strip and the profile on one distance axis (44 px left,
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

Thickness uses millimetres, two decimals in the interface; distance uses metres and integer
segment boundaries. Dates identify the baseline or forecast explicitly. Russian formatting uses
commas and grouped digits. Exports retain the API CSV contract.

## Component behavior

- Pipe selection, range, coordinate input, profile and priority row share one selected segment.
- Hover previews a possible pick. Click or drag selects. Clicking the pipe selects a segment; clicking the unroll also opens its section.
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
requested only when needed and pauses in a hidden document. Pixel density is capped at 1.75.

The 2D fallback and coordinate controls work if WebGL or the renderer module is unavailable. The
catalog includes ready, missing, loading, empty, error and no-3D examples. A loading specimen is a
labelled catalog state, not a fabricated network request.

The physical scene uses the original steel, weld, support and oil materials. Route and unroll
fall back to Canvas2D; section falls back to the SVG wall drawing on context loss or creation failure. Review widths 375, 768, 1280 and 1440 in both themes, focus and keyboard order, long labels, missing data,
WebGL context loss and reduced motion. React checks do not cover the HTML example; its browser tests
and screenshots are recorded separately in `work/audits/pipe-style/`.

## Engineering variants, 2026-11-15

`/design/variants` adds five compositions within the existing Onest, graphite/paper and steel/rust/
amber system. The original product and `work/design/ds/` catalog remain separate entry points.
The scanner aligns a side elevation with evidence tracks; the atlas orders individual segments;
comparison aligns a dated baseline and forecast; inspection centres a local section beside a queue;
drafting joins the longitudinal drawing, scalar section and passport on a framed sheet.

These screens share the same selected segment and distance range. Wide workspaces place evidence
beside the instrument. On narrow screens a compact segment, forecast and priority summary precedes
the instrument, with full evidence below. The gallery uses captured screens with a stated pipe and
segment; live comparisons share the current selection and stack until there is room for two panes.

The thickness colour domain runs from the complete pipe's minimum forecast to its nominal wall,
independent of zoom or filtering. The atlas interval-width layer uses its own labelled millimetre
scale based on the complete pipe. Priority and measurement availability have
separate textual legends. The existing palette does not establish an engineering safety threshold.

The variants' evidence tracks use neutral forecast marks, rust VTD marks, a dashed nominal baseline
and a labelled interval band. Vertical ticks and selected readings supplement colour. The scalar
section uses concentric boundaries for nominal, P10 and P90 with distinct strokes, numeric keys and
a forecast dimension; its caption states that wall scale is exaggerated and angular defects are
not reconstructed. These encodings are local to the engineering variants.

Typography, spacing, focus and motion retain the existing semantic tokens. Numbers update directly.
The shared `RangeField` and `Card` plain appearance are recorded in `COMPONENTS.md`; the new feature
catalog does not replace the original generic kit.

## Retained frontend, 2026-11-15

The combined Inspection workspace is the sole operational composition at `/`. Gallery and
alternate workspaces, old pipe, overview and separate priorities screens were deleted on user
request. Data/model pages remain supporting evidence. Earlier variant catalog entries above
describe the exploration history; only Inspection, ComparisonPanel, its shared instruments and
the main 3D pipe scene and scalar section fallback remain implemented.

The main Inspection composition hides the duplicate matte scene readout; PipeScene still supports
it for other callers. Circumferential defect shape and size are illustrative, not measured geometry.
