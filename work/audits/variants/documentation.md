# Engineering variants documentation

Date: 2026-11-15, MSK. Inspected detached snapshot `/tmp/duppel-variants-document`, HEAD `dbb9a47`.
This is an ordinary extension of the incumbent duppel system. The snapshot includes earlier
uncommitted restoration work; the complete Git diff is not the scope of this documentation pass.

## Changes

- Appended the engineering-variants section to `frontend/DESIGN.md`.
- Appended shared API and feature-catalog notes to `frontend/COMPONENTS.md`.
- Wrote this report. No source code, existing document sections or original catalog files changed.

The additions retain the incumbents' English language and section style. The prose was checked with
the humanizer workflow for unsupported claims and repetitive framing.

## Evidence inspected

| Statement | Source evidence |
|---|---|
| Existing visual authority | `frontend/PRODUCT.md`, `frontend/DESIGN.md`, `frontend/COMPONENTS.md`, `work/screens/design-variants.md`, `work/design/variants/brief.md` |
| Palette and type continuity | `frontend/src/shared/styles/tokens/{semantic,typography,radius}.css`; variant CSS modules use these tokens |
| Five compositions and local responsive ordering | `frontend/src/pages/design-variants/`; `frontend/src/features/engineering-variants/{scanner,atlas,comparison,inspection,drafting}/`; `workspace-frame.tsx` and its CSS; `summary/focus-summary.tsx` and its CSS |
| Fixed colour domains and source distinctions | `atlas/atlas.tsx`, `scanner/scanner.tsx`, `inspection/inspection.tsx`, `drafting/drafting.tsx`, `track-model.ts`, `track-marks.module.css`, `controls/{scale-legend,evidence-legend}.tsx` and their CSS; RU `variants.json` and `inspector.json` |
| Scalar section | `drafting/segment-section.tsx` and CSS: uniform concentric boundaries, separate nominal/P10/P90 line styles, interval band, numeric keys and schematic caption |
| Shared additions | `frontend/src/shared/ui/forms/range-field/`, `frontend/src/shared/ui/layout/card/`, `frontend/src/shared/ui/index.ts` |
| URL state and gallery behaviour | `frontend/src/entities/pipe/use-workspace-state.ts`; `variants-workspace.tsx`, `variant-gallery.tsx` and their CSS |
| Captured appearance | Visually inspected `frontend/public/design-previews/scanner.webp` in dark and `drafting.webp` in light; read their provenance JSON and the steel rendering provenance |

Paths without a prefix in the variant rows are relative to
`frontend/src/features/engineering-variants/`. Page filenames are relative to
`frontend/src/pages/design-variants/`.

The inspected captures show pipe 1250022871, segment 130 at a 1440px viewport. Their sidecars identify
correction-round-1 Chromium captures against live FastAPI data. This pass checked their appearance
and metadata, but did not independently recapture or certify their source data.

## Authority and drift

No `.impeccable/design.json` was created. The documenter workflow says ordinary extensions preserve
the incumbent system; the sidecar regeneration step applies when regenerating the system document.
Here only a scoped section was appended. Frontend rules also keep token values exclusively in
`src/shared/styles/tokens/`. Adding another normative token source or migrating the incumbent
headings would exceed this task.

Pre-existing catalog drift remains: `COMPONENTS.md` still marks Disclosure and ScrollArea as specs,
although implementations are exported by `shared/ui/index.ts`; its proposed controlled Disclosure
API differs from the implementation's `defaultOpen` API. Legacy leak recipes and historical React
status tables are retained, with the incumbent section 7 already identifying the old leak semantics
as superseded. These sections were not rewritten in this extension.

The incumbent design's general measured/forecast line description differs from the variants'
neutral forecast and rust observation marks. The appended section scopes the observed encoding to
these variants rather than changing the original catalog's system rule. No new global prohibition,
palette, font, generic card policy or claim of measured angular geometry was introduced.

## Validation limits

SHA-256 prefix checks confirmed that both incumbent frontend documents were preserved byte for
byte before the appended sections. Whitespace checks and scoped `git diff --check` passed.

This was a source and documentation pass, with two existing raster inspections. No application,
browser interaction suite, frontend verify command or physical-device check was run here. The
snapshot's `fix-verify.log` reports 36 rule checks, 376 tests and a completed build; those are existing
run results, not new validation by this pass. Its warnings remain recorded in that log.

`review-fixes.md` describes corrections to the original seven review findings. During this pass,
the parent reported a final reviewer disposition of `ship` for those fixes and the compact-grid
regression. That is a scoped review result, not a new whole-surface pass by this documenter. The
parent's final rebuild and narrow-screen recheck were still underway at that update. The parent
retains ownership of context updates and final verification; this pass's write boundary contains
only the two appended frontend documents and this report.
