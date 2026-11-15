# Superlative reference and engineering workspace direction

Date: 2026-11-15. Discussion and research only; no frontend implementation.
Branch at review: `feat/frontend`, HEAD `4db9fdac6367f238391b2984791fd99d8423a6f3`.

## User intent

The user approved remembering the engineering critique, selected the Superlative Refero style,
and asked whether it can combine with the current frontend and the existing 3D pipe.
The existing pipe must remain. This is a direction proposal, not approval of a completed screen spec.
Preserve duppel identity, Russian UI, both themes and the original design catalog.

## Sources and capture scope

- Selected style: https://styles.refero.design/style/10ab6120-3d03-48ff-aebe-0b4910edc046
- Style identity: Superlative, mixed light/dark, industrial product presentation.
- Source site: https://playsuperlative.com/
- Source inner page attempted: https://playsuperlative.com/monolab.html
- `refero-export-1.txt`: full DESIGN.md export extracted from the supplied page's rendered HTML
  preformatted block. It contains palette names/hex/CSS variables, surfaces, typography families,
  fallbacks, weights, sizes, line heights, tracking, spacing scale, radii, layout, component list,
  agent prompt examples, guidelines verbatim, related brands, CSS and Tailwind quick starts.
- `refero-preview.jpg`: reference screenshot downloaded from the image linked by Refero;
  visually inspected, not a new screenshot of our product.
- Separate CSS Variables, Tailwind v4 and Design Tokens tab payloads were not independently
  inspected. CSS and Tailwind within the DESIGN.md export are available; separate JSON is not captured.
- Live desktop homepage was visually inspected with computer use. The photographed hardware,
  large light-weight headline and compact labels reproduce the reference's overall composition.
  Browser accessibility text reported unavailable media; motion fidelity was not verified.
- Inner-page navigation produced a blank capture, and computer use intermittently reported window
  changes. A 1440/375 matrix, mobile inspection, theme controls and 4–6 source captures were not
  completed. Do not describe this study as a complete responsive audit.

The existing `work/design/style.md` is the historical monopo reference and remains intact.
Refero describes normalized measurements and interpreted roles, not authoritative source components.
Its orange color role mentions backgrounds while its guidelines prohibit large orange fills;
prefer restrained accents in our proposed adaptation. Do not blindly import its generated tokens.

## Engineering critique retained from the previous turn

Scope: live localhost:18080 main workspace, route and section presentation, and expanded dates/sources.
Model/data pages could not be reliably inspected because of blank captures and intermittent computer
use window failures. Missing content there is unverified, not evidence of missing backend features.

Observed strengths:

- Inspection shortlist explicitly ranked by predicted minimum thickness; first 10% stated.
- Segment 131 represented 1310–1320 m, forecast 2.90 mm on 2023-12-01, VTD 3.68 mm on 2022-07-06,
  nominal 8.00 mm, horizon 513 days, P10/P90 2.57–3.22 mm.
- Forecast, baseline dates and unverified interval coverage explicitly labelled.
- Sources disclosure showed historical VTD and acknowledged unavailable segment-level UZT.
- Queue, selected measurement and physical pipe form a coherent starting point.

Priority gaps in the inspected workflow:

1. No local factor explanation was found beside the selected forecast. A model name/snapshot is
   provenance, not an explanation of why this location has a low forecast.
2. Interval endpoints and a coverage caveat do not establish trust for the selected horizon.
   Show relevant validation evidence when available; retain explicit unknowns otherwise.
3. Distances exist, but grouping adjacent shortlisted segments into practical inspection sections
   was not seen. This is a proposed product capability, not a mandatory submission requirement.
4. A result.csv link exists; a field inspection worksheet, recorded decision or chosen worklist
   export was not found in the inspected main screen. Do not claim all exports are absent.
5. The large central scene pushes comparison charts below the initial viewport. Section view grows
   the object substantially while repeating the same thickness already present in the inspector.
6. Illustrative geometry can look like measured reconstruction. Its status must be apparent beside
   the object, not only beneath a large scene. A segment minimum does not specify angular geometry.

Desired engineering sequence: choose a priority section, inspect dated evidence and forecast,
understand reasons and limits, then assemble an actionable inspection list. Ranking does not certify
failure, and nominal wall is not an approved operational safety threshold.

## Proposed combination

### Preserve

- Existing 3D pipe, steel/oil materials, section and unroll interactions, selection and camera logic.
- duppel brand and Onest as the primary readable Russian UI font.
- Current API-backed data and linked segment/coordinate/forecast selection.
- Both themes, accessibility, keyboard controls, explicit missing-data states and honest labels.

### Adapt from Superlative

- Ink/graphite and warm paper surfaces, thin structural lines, almost square geometry.
- Directional lighting and clear object silhouette: let the material carry the visual character.
- Compact equipment-like metadata and restrained amber/orange accents with explicit meanings.
- Light-weight prominent measurements, stable tabular digits and aligned units.
- A unified composition where the object, annotations and evidence belong to one workspace.

### Proposed desktop composition

1. Compact top identity strip: pipeline, forecast date, baseline date, available-data state.
2. Left: a scan-friendly priority list with distances, forecast and evidence availability.
3. Center: the existing interactive pipe, with selected segment and measured coordinate clearly marked.
4. Right: dated actual/forecast/nominal values, interval, local explanation and source evidence.
5. Directly beneath the scene: the longitudinal forecast/baseline profile, aligned with the selected
   coordinate and visible in the initial working viewport where space allows.
6. A worklist action with an honest availability state; implement only with an agreed data contract.

The pipe stays visually prominent. Rebalance empty space and oversized controls so the graph and
readout can be used without leaving the object's context. Scene labels must not cross critical
geometry or low-contrast highlights. On narrow screens use selected-section summary, compact scene,
profile and evidence in reading order instead of shrinking a desktop grid.

Light theme proposal: warm paper evidence panels with a graphite scene surface for the steel object.
Dark theme proposal: distinguish graphite surfaces with readable boundaries and consistent contrast.
These are proposals; neither theme has been implemented or visually validated in this direction.

## Adaptations and conflicts with project rules

- Reference-wide uppercase condensed labels conflict with the project ban on all-caps eyebrows
  everywhere and can harm long Russian labels. Keep sentence case for workflow and prose; any
  equipment-style label is a small, deliberate exception to discuss in the screen spec.
- The custom SL fonts are not locally licensed/verified for reuse or Cyrillic. Keep Onest;
  evaluate a second label family only if it has a clear need and verified support/license.
- A 90px headline and 120–240px editorial gaps are unsuitable defaults for the operating workspace.
  Establish denser task-specific spacing; retain expressive type for selected readouts or presentation.
- A strict single-color palette cannot erase semantic error, focus, measured/forecast and priority
  distinctions. Preserve our semantic tokens and supplement color with text/line styles/icons.
- Ghost-only actions are not an unconditional rule: primary actions need clear hierarchy and states.
- No reference Tailwind/UI kit migration. Implement through the existing tokens and own components.
- No label text over busy imagery without legibility. No ornamental instrument controls that suggest
  unsupported physical measurements. No dependency on source-site video for the operating workflow.

No conflict needs approval in this study because no conflicting implementation is being made.
Next step if the user proceeds: one concrete main-screen specification with existing controls mapped
to the new hierarchy, then a reviewable composition in both themes, before propagating the system.

## Design-system deliverable proposed for later

A coherent reference catalog with foundations, semantic colors, typography, layout, pipe-specific
instruments, generic controls, charts, real data/missing/error states and complete main-screen examples.
The source of truth stays tied to actual implementation. The catalog should show the pipe and
engineering evidence working together, rather than only color swatches and isolated buttons.

Validation this turn: source reading, reference image inspection, limited live desktop inspection,
and context budget check. No code tests were needed or run; no frontend code changed.

## Monopo synthesis, 2026-11-15

User added https://styles.refero.design/style/3e52dd36-6ab1-48c6-bc40-47ef6d33abc2
as a conceptual influence and asked for careful thought, not immediate implementation.
The complete historical extraction remains in `../style.md`. The current Refero description and
linked preview image were inspected again. The current source-site web read returned only Loading;
new live motion verification was not performed. Historic source observations are not current tests.

### Design thesis proposed

Superlative contributes the tangible industrial object, precise annotation and calm structure.
Monopo contributes spatial continuity, optical focus, soft reflected light and deliberate camera
movement. The actual inspection task governs visibility, hierarchy and response speed.
This division describes a proposal, not approval to replace tokens, materials or existing controls.

The same existing pipe remains across three meaningful scales:

- Route: a readable steel object with a selected band, distance scale and linked longitudinal profile.
  Light defines silhouette and welds; empty space carries selected evidence rather than decoration.
- Segment: selecting a queue entry focuses that location. The label and graph cursor identify the
  new segment immediately; optional camera motion catches up without delaying the data.
- Section: the existing cut/section view brings the wall into focus, with nearby forecast, nominal
  and dated actual values. The selected coordinate persists so the user understands where the view is.

Monopo's lens suggests attention concentrated on an area. Our existing selection/scanning ring can
provide that focus; no new floating glass sphere or unsupported physical instrument is required.
Any framing or annotation refinement must remain attached to the existing engine and truthful data.

### Material and composition

- Keep the user's existing pipe and oil asset. A proposed art-direction pass may tune lighting,
  framing and background integration; it does not authorize replacing the model or its mechanics.
- Translate fluid atmosphere into restrained reflections on the object and dark oil surface, while
  retaining material identity. Do not infer that monopo's colorful fluid is a physical oil reference.
- Keep data surfaces visually quiet and stable. Material highlights must not look like a severity
  heatmap; diagnostic colors always need a separate labelled meaning.
- Let short callouts and readable measurements belong to the scene composition. Long explanation,
  tables and validation evidence need steady readable surfaces.
- Use one consistent control grammar derived from our current kit. Combining Superlative's nearly
  square buttons with monopo pills arbitrarily would weaken the result.
- Retain Onest and duppel identity. Typographic scale and spacing can establish hierarchy without
  importing both references' font families or enormous editorial headlines.

### Motion and working speed

- Animate spatial transitions only when they help explain position or scale; no continuous camera
  drift, forced scroll choreography, cursor distortion or perpetual movement behind charts.
- Frequent queue stepping should remain immediate. Do not replay a cinematic entrance per segment.
- Use existing camera transitions; preserve interruption, reduced motion and keyboard behavior.
- Show units, dates and numeric values directly, with no counting animation.
- Global fluid background, glass effects on all panels and full-page rainbow color would conflict
  with the product rules and weaken data legibility. They are not part of this proposal.

The proposed signature is a tactile pipe under inspection: precise as an instrument, with a coherent
spatial journey from overview to wall. Both themes need equal art direction; the light version
should retain material presence on a warm paper field, not become a low-contrast inversion.

Before implementation, review one real first-viewport composition containing the pipe, queue,
selected evidence and profile together, plus its section state. Evaluate engineering usefulness
alongside visual character. Do not produce another unrelated design gallery or remove the pipe.
