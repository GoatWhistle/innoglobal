# Project context

Project: duppel, always lowercase (name and mark approved 2026-11-14, `work/naming.md`, `docs/brand/`)
Current brief: forecast minimum residual wall thickness for two pipelines, per 10 m segment at T.
Event identity, deadline and criterion weights are not confirmed by the provided PDF.

## Current facts

| Topic | Status | Current fact | Evidence |
|---|---|---|---|
| Organizer case | confirmed source | Two initial-data cases, withheld target VTD, squared Pearson correlation | brief/sources/pipeline-degradation.pdf, pp. 1–3; received 2026-11-14 |
| Current scope | approved | Complete local product on real imported data, per work/full-product-plan.md | work/full-product-plan.md, 2026-11-14 |
| Design | verified locally | Live React port; Manrope/IBM Plex Mono, graphite/paper, material 3D pipe, map and docked chat | frontend/DESIGN.md; work/audits/material-workspace/README.md, 2026-11-15 |
| Data | verified locally | ML source CSVs, DuckDB and 2000 forecasts connected to FastAPI and React | README-ML.md, result.csv; merge 251a5ab |
| Current frontend | verified locally 2026-11-15 | Map and workspace consume API; 382 frontend tests, 131 backend tests, 4 chat browser tests; separate Compose on 18081 | work/audits/material-workspace/README.md, 2026-11-15 |
| Earlier leak simulator | removed 2026-11-14 | Not part of the final design system; brief kept | brief/pipetwin-original.md; git history |

## Pointers

- [Session](SESSION.md)
- [Open questions](open-questions.md)
- [Organizer materials](../brief/README.md)
- [Working artifacts](../work/README.md)
- [Product documentation](../docs/README.md)
- [Pipe screen verification](../work/audits/pipe-style/README.md)
- [Design rules](../frontend/DESIGN.md)
- [Domain vocabulary](../docs/glossary.md)
