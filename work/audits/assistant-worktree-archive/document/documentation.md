# Engineering assistant: design documentation handoff

Reviewed 2026-11-15. Scope: the frontend extension in the isolated assistant worktree.
The documenter owns only this report. No implementation, backend, system-document or token edits
were made during this handoff.

## Decision

Preserve `frontend/PRODUCT.md`, `frontend/DESIGN.md` and the existing token source. The assistant
extends the incumbent Operate workspace; it does not establish a replacement visual world.
The existing `Engineering assistant frontend` entry in `frontend/COMPONENTS.md` captures the
new composition and honestly identifies its NDJSON transport as a future client contract.
No additional design-system document or `.impeccable/design.json` is needed for this extension.

The repository's frontend rules keep visual values exclusively in
`frontend/src/shared/styles/tokens/`. This takes precedence over the generic document reference's
frontmatter extraction workflow. No duplicate palette, typography or spacing source was created.

## Incumbent system retained

| System commitment | Source and observed implementation |
| --- | --- |
| duppel identity, lowercase name | `PRODUCT.md`; unchanged wordmark in both desktop captures |
| Physical pipe and linked engineering evidence | `DESIGN.md`; existing 3D scene, three view controls, selected segment, profile and dates remain visible |
| Equal graphite and paper themes | `tokens/palette.css`, `tokens/semantic.css`; final desktop and mobile captures use the corresponding neutral surfaces and text roles |
| Onest and tabular measurements | `tokens/typography.css`; assistant inherits the interface font, heading/caption roles and numeric treatment |
| Flat ruled surfaces and restrained controls | `tokens/radius.css`, `tokens/elevation.css`; message dividers, neutral composer and shared controls continue the surrounding workspace |
| Shared layout vocabulary | `tokens/space.css`; queue, assistant column and scene retain the existing workspace dimensions |
| Shared interaction primitives | `engineering-assistant.tsx`; Button, Tabs, Segmented, ScrollArea and the existing mobile Drawer are composed rather than replaced |

The assistant keeps current segment facts above the conversation. The data tab retains the existing
SegmentFacts content. On narrow screens the same panel moves into the shared modal Drawer.
Message text, contextual metadata, numerical evidence and explicit action buttons have separate
roles. Messages retain their request context while page selection continues to use existing URL
state. AssistantWorkspace owns source disclosure and validates proposed view actions against the
current pipe and snapshot.

These are composition-specific patterns. They should remain in COMPONENTS.md and the assistant
surface contract rather than become global rules for every duppel screen.

## Connection truth

`shared/api/assistant-contract.ts`, `assistant-stream.ts` and `assistant-validation.ts` describe
the optional future client protocol. They do not establish a working server endpoint or a live
model integration. The current absence of `/api/v1/assistant` produces the unavailable state with
retry and directs the user to the Data tab. Existing source-data requests remain unchanged.

The reviewed worktree has an empty diff for `backend/`, `.env.example` and generated
`shared/api/schema.gen.ts`. The report does not claim an independently verified model response,
paid check or backend process lifecycle. Browser test responses are evidence of frontend behavior
only and are not runtime fallback content.

## Visual evidence inspected

The following captures were opened and inspected from the main assistant worktree at
`/Users/kaifarikman/hackathons/innoglobal-assistant/work/audits/engineering-assistant/`:

- `final-light-1440.png` and `final-dark-1440.png`: queue, pipe, profile and assistant column;
  the extension retains the incumbent object, typography, neutral themes and control language.
- `final-light-375.png` and `final-dark-375.png`: open assistant Drawer; facts, tabs, prompt
  suggestions, scope and composer fit the supplied viewport in both themes.
- `not-connected.png`: an actual unavailable response rather than a synthetic successful answer;
  retained facts and composer remain visible around the conversation's scroll region.

This is a documentation/visual handoff. The existing README reports the implementation's verify
and browser runs; those checks were not rerun by the documenter.

## Confirmation

The narrow frozen-range presentation issue is resolved. `FrozenContext` in
`assistant-answer.tsx` now applies `format.integer` to both range endpoints. Inspection supplies
the visible chart range through `props.aside?.(range)`. The refreshed `not-connected.png` was
opened and inspected: the message records `1 270–1 340 м`, matching the displayed chart window.
This confirmation covered that correction only; no additional audit pass was performed.

No open design-documentation correction remains in the reviewed evidence. Preserve the incumbent
world and the frontend-only scope.
