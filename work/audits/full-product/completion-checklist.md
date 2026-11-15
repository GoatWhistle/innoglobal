# Completion evidence

Scope: work/full-product-plan.md and progress-review.md. No training or external publication.

| Requirement | Authoritative evidence |
| --- | --- |
| Real-data Compose without paid keys | logs/build.log, logs/compose.log, docker-compose.yml read-only mounts |
| Both case IDs and target dates | Mentor transcript 11:04–11:34; domain/cases.py; docs/data-contract.md |
| One traceable forecast for every segment | Integration test test_imported_snapshot_is_consistent, all 525 + 1475 keys and terminal bounds |
| Five functional routes | e2e/product.spec.ts over overview, both workspaces/priorities, data, model |
| Synchronized selection | Workspace passes one URL selection to profile, route, section and inspector; e2e Home/End/arrow and priority jump |
| UI/API/source/export agreement | Source integration samples first/middle/last/priority; browser API-value assertion; byte-equal CSV, logs/runtime.json |
| Observation/forecast/unknown/schematic distinction | Profile legend and separate API fields; absent case2 observations; labelled schematic section; NoValue |
| No invented uncertainty, target truth, safety or causality | Source quantiles with coverage caveat; historical dates; relative ranking; global importance copy |
| Current visual identity and responsive behavior | Onest/token rules, actual screenshots at 375/1440 both themes, no-overflow checks |
| Errors, keyboard, deep links, WebGL absence | e2e outage/retry, direct URL selection, keyboard, reduced motion, WebGL-blocked scenario |
| Historical forecast–fact views when reliable | 55 verified case1 pairs, scatter/table, independent metrics; case2 source_mismatch with no points, tested |
| Required checks and records | logs/frontend-verify.log, logs/backend.log, logs/compose-e2e.log |
| Honest launch and product docs | README, docs/{running,api,data-contract,design-decisions,evidence,limitations}.md; link check |

Known data limitations are product states, not unimplemented controls: target VTD withheld,
uncalibrated quantiles, no archived-training manifest, incompatible case2 historical series.
The imported prediction snapshot is preserved. No acceptance claim covers new ML accuracy,
physical touch hardware or browsers other than Chromium.
