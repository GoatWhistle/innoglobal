# Main 3D restoration: documentation review

Date: 2026-11-15. Scope: incumbent extension/restoration, not a new visual world.
User authority: «не придумывай, а просто возьми».

## Evidence checked

- Read the three context files, frontend rules, canonical Impeccable document reference,
  `frontend/PRODUCT.md`, `frontend/DESIGN.md`, `frontend/COMPONENTS.md`, and the root
  `work/screens/main-3d.md` restoration specification.
- Inspected `pages/design-variants/variants-workspace.tsx`, its CSS, `pipe-controls.tsx`
  and its CSS; `engineering-variants/inspection/inspection.tsx`; `pipe-scene/pipe-scene.tsx`;
  and `segment-strip/segment-strip.tsx` in the supplied frontend snapshot.
- Read the production verification summary at root `work/audits/main-3d/README.md`.
  Its reported 375 unit tests, five production browser scenarios and 12 captures are parent-run
  evidence, not checks rerun by this documentation reviewer. Images were not visually reviewed here.
- `.impeccable/design.json` is absent at both repository root and `frontend/` in the supplied
  worktree and root repository. No sidecar was generated and no system document was overwritten.

## Finding

The implementation uses the incumbent shared Segmented camera appearance, Button, TextField,
NumberField and Select. Camera-bar and coordinate-form CSS reference existing semantic spacing,
type and colour tokens. There is no reason to create tokens or a replacement visual identity.

The page composes route/unroll/section controls with URL `view` state, shortcuts 1/2/3,
PipeScene, SegmentStrip and the coordinate form. Inspection places that scene before comparison,
outside a disclosure. Coordinate changes remount PipeControls with the current segment key.
PipeScene defaults to showing its readout but this composition explicitly passes `readout={false}`;
selected facts remain in SegmentFacts. Its fallback prop retains the scalar SegmentSection.
The parent restoration report records unchanged engine files; this review does not independently
claim a byte comparison of the engine.

## Targeted documentation corrections

No DESIGN.md regeneration is needed. Apply narrow corrections to current-behaviour statements;
keep historical variant catalog entries explicitly historical.

1. In `frontend/COMPONENTS.md`, replace the stale SteelPipe / AlignedTrack row with:

   `| AlignedTrack | aligned-track.tsx | Shared evidence distance axis, pointer range zoom, keyboard movement and selected cursor |`

   Immediately after the feature table, add:

   > The main Inspection instrument is the existing `features/pipe-scene/PipeScene`, composed by
   > `pages/design-variants/variants-workspace.tsx` with the camera Segmented control,
   > `features/segment-strip/SegmentStrip` and `pages/design-variants/pipe-controls.tsx`.
   > Route, unroll and section use URL `view` state and shortcuts 1/2/3. The coordinate form and
   > previous/next actions share the selected segment. PipeScene accepts `readout?: boolean`,
   > defaulting to visible; this composition passes `false` because SegmentFacts already presents
   > the values. The former SteelPipe component and raster are removed. Canvas2D/SVG remain
   > WebGL fallbacks.

2. In COMPONENTS.md's combined inspection extension, replace “Inspection keeps the queue, steel
   pipe and selected facts around the panel” with “Inspection keeps the queue, existing 3D pipe
   scene and selected facts around the panel.”

3. In the final retained-frontend paragraph of both DESIGN.md and COMPONENTS.md, replace
   “the scalar section/optional pipe scene remain implemented” with “the main 3D pipe scene and
   scalar section fallback remain implemented”.

4. In DESIGN.md's desktop structure, qualify the matte readout: the main Inspection composition
   uses adjacent selected facts instead of a duplicate scene overlay. The original standalone
   scene readout remains supported by PipeScene.

5. In PRODUCT.md, replace the stale route inventory “React provides overview, pipe workspace,
   priorities, data quality and historical validation” with “React provides the combined
   Inspection workspace with its priority queue, data quality and historical validation.”

6. DESIGN.md's statement that unroll answers the shape and size of each thinning needs a narrow
   truth correction: it shows the existing illustrative circumferential distribution and selects
   a segment; the source data does not establish actual circumferential defect shape or size.

## Changes made by this reviewer

Only this report was written. No source, token, PRODUCT.md, DESIGN.md, COMPONENTS.md or context
file was changed. No context launcher, build or browser run was executed in this worktree.
