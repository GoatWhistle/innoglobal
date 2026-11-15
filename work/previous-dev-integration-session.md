## Dev integration

2026-11-15 user requested fetch, merge current frontend into dev and branch for more frontend work.
Latest state supersedes branch/metric notes above: frontend saved as 4035b31; dev base 8bb2210.
Merge uses verified original common tree f3d7a42 despite rewritten history. ML files preserved from dev;
API predictors now dens_quant_cal / ens_prior_cal. Frontend verify 375 and backend 128 tests pass.
User correction: dev must contain none of our frontend commits. Local/remote dev restored to
8bb2210 using an exact force-with-lease after checking no intervening commits. All frontend work
remains on feat/frontend (based on 8bb2210); this is the active branch. Do not push work into dev.
Compose remains at localhost:18080. Details: work/dev-integration.md.

## Limits and next

Historical metrics are imported, not retrained. Target VTD is withheld. P10/P90 coverage is not
calibrated. 1245/1475 case2 predictions equal 3.469 mm, not all predictions; ties use segment ID.
The physical scene uses labelled illustrative angular thinning; values come from the real API.
No physical touch-device or cross-browser certification. Product docs describe current behavior.
Setup has activated repository hooks; use the configured human Git identity for commits.

Previous completion evidence: work/audits/full-product/previous-completion.md.


## Current task

2026-11-15 user: «exp/explain спуль сюда»; «и смержи его с https://github.com/GoatWhistle/innoglobal/commit/d364b6c684bcba489a41c5b8817cc70dbc858980».
Earlier analysis constraint: «путь давания сразу всех цифр в ллм - нет».
Branch feat/redesign-oil fast-forwarded to d364b6c, then merged origin/exp/explain (dc52b2a).
Both histories are ancestors of HEAD. No push requested or performed.
The previous local analysis note is preserved in stash named
`local project analysis before explain merge` and /private/tmp/innopa-session-before-explain.patch.
The old analysis describes the pre-merge ML; re-check claims against the new artifacts.
Result, contribution and card artifacts have 2000 matching unique keys and forecasts.
Merge commit 7e607a8. Backend unit/integration: 128 passed; DuckDB subset: 11 passed.
Initial test collection lacked optional SDKs; installing the llm group resolved it.
Frontend build/browser checks not run; dependencies absent in this clone.
