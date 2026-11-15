# Combined inspection documentation review

Date: 2026-11-15. Scope: ordinary extension of `/design/variants/inspection` in Operate mode.
Authority: `work/screens/combined-inspection.md`, `frontend/PRODUCT.md`, `frontend/DESIGN.md`
and the existing engineering-variants catalog in `frontend/COMPONENTS.md`.

The combined route preserves the incumbent Onest, graphite/paper and steel instrument system.
Its change is composition and evidence coordination. It introduces no new identity, token set,
global style or shared UI primitive. `PRODUCT.md`, `DESIGN.md` and their existing text remain intact.

## Documented behavior

| Contract | Source inspected | Result |
|---|---|---|
| Queue, steel pipe, comparison and inspector form one workspace | `inspection/inspection.tsx` | Existing inspection route owns the composition; priority and distance ordering remain available |
| Combined comparison starts with a full overlay | `comparison/comparison-panel.tsx` | `compact` starts in overlay mode, passes no clipping boundary and omits `RangeField`; beside mode separates the sources |
| Standalone comparison retains its boundary | `comparison/comparison.tsx`, `comparison/comparison-panel.tsx` | Default panel starts beside; its overlay exposes the existing boundary control |
| Baseline selection governs the whole comparison | `comparison-panel.tsx`, `segment-facts.tsx`, `summary/focus-summary.tsx` | Dated VTD or nominal fallback supplies tracks, signed difference, facts, increase warning and baseline horizon |
| Distance and selection remain shared | `inspection.tsx`, `track-model.ts`, `aligned-track.tsx`, `entities/pipe/use-workspace-state.ts` | Local range contains the selection and up to three adjacent segments each side; explicit range zoom switches to the shared URL range |
| Evidence limits remain visible | `track-model.ts`, `segment-facts.tsx`, supplied captures | Difference is forecast minus baseline, missing dated observations stay missing, quantile coverage remains unverified and positive difference is not a corrosion rate |

Feature paths in the table are relative to `frontend/src/features/engineering-variants/`, except
the entity path, which is relative to `frontend/src/`. The selected baseline, mode and local-scope
state are component state; the documented shared URL contract is selection and distance range.

## Supplied visual evidence

Inspected [light desktop, 1440px](screenshots/light-1440.png) and
[dark mobile, 375px](screenshots/dark-375.png) directly. Both show pipe 1250022871, segment 130,
the 6 July 2022 baseline and the 1 December 2023 forecast. These are observations from the captures,
not a new measurement run.

The desktop image keeps the queue left, aligned steel pipe and comparison centre, and selected facts
right. Its compact toolbar carries mode, local/whole range and dated baseline. The plotted evidence
spans the full local range without a wiping divider. The mobile image puts selected forecast and
increase warning first, then the pipe and plots, full facts and queue. Controls wrap, baseline text
remains visible, and the signed difference and interval caveat accompany their marks.

No material visual contradiction with the surface brief was found in these two captures. The wider
six-capture review belongs to the reviewer, who reports a ship verdict for the whole combined
composition. This pass does not claim that wider inspection as its own.

## Catalog change and reported drift

Added one scoped, append-only `ComparisonPanel` note to `frontend/COMPONENTS.md`. It records the
private feature contract and the deliberate distinction between combined and standalone overlay.
Existing generic components, values, examples and historical sections are preserved.

- `frontend/DESIGN.md` still describes inspection as a local section beside a queue. This remains
  compatible but does not name the new dated comparison; the surface brief and catalog note carry
  the extension without promoting its layout into a global design rule.
- The Impeccable launcher resolved the existing product and design files but did not discover the
  root `work/screens/combined-inspection.md` from the frontend working directory. That brief was
  read directly. No discovery configuration or design sidecar was regenerated.
- Earlier catalog sections contain historical leak examples and spec statuses. The existing
  wall-scanner handoff marks their scope; this pass makes no unrelated cleanup.

## Verification boundary

This pass read source and documentation, ran the Impeccable context loader and inspected the two
supplied images. It ran no browser session, application tests, build or detector, and changed no
frontend source. The coordinator reports frontend verification passing 36 rules, types, lint,
376 tests and build, plus 50 passing production Compose checks. Those execution results and their
final evidence remain coordinator-owned.
The coordinator also owns session/context updates and release claims.
