# Project context

Project: duppel, always lowercase (name and mark approved 2026-11-14, `work/naming.md`, `docs/brand/`)
Current brief: forecast minimum residual wall thickness for two pipelines, per 10 m segment at T.
Event identity, deadline and criterion weights are not confirmed by the provided PDF.

## Current facts

| Topic | Status | Current fact | Evidence |
|---|---|---|---|
| Organizer case | confirmed source | Two initial-data cases, withheld target VTD, squared Pearson correlation | brief/sources/pipeline-degradation.pdf, pp. 1–3; received 2026-11-14 |
| Current scope | approved | Evolve existing style; full HTML catalog plus one interactive wall scanner; synthetic example | work/screens/wall-scanner.md, 2026-11-14 |
| Design | implemented | Onest, graphite/paper, own icons, RU only; selected section links pipe, thickness profile and priority list | frontend/DESIGN.md; work/design/ds/screen-thickness.html |
| Data | implemented | Deterministic examples only; no trained degradation model, real measurements or scanner API | work/design/ds/scanner/README.md |
| Pipe-led screen | verified locally | Route, unroll and section on one pipe; 8 pipe components | work/audits/pipe-style/README.md, 2026-11-14 |
| Scanner UI | verified locally | Browser scenarios, keyboard/fallback, axe and width/theme matrix passed; visual verdict ship | work/audits/scanner/README.md, 2026-11-14 |
| Earlier leak simulator | preserved | Prior experiment, not the new brief | brief/pipetwin-original.md; work/design/ds/screen-twin.html |

## Pointers

- [Session](SESSION.md)
- [Open questions](open-questions.md)
- [Organizer materials](../brief/README.md)
- [Working artifacts](../work/README.md)
- [Product documentation](../docs/README.md)
- [Scanner verification](../work/audits/scanner/README.md)
- [Design rules](../frontend/DESIGN.md)
- [Domain vocabulary](../docs/glossary.md)
