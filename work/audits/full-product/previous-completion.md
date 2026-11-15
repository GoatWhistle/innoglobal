## Completion audit

Original five progress-review findings and the full-product acceptance checklist are verified.
Historical comparison now joins chart_data.json to train_dataset.csv only after checking all
observed values, unique keys, pipe IDs and split dates. Case1 exposes 55 pairs as a separate
saved run, computed r2=.3434524851 and MAE=.3506181818; this is not selected-model r2=.5011.
Case2 returns source_mismatch and no points because its archived observations do not agree.
UI provides scatter/table and an honest unavailable state. No training or source replacement.

Final verification: frontend 366 tests plus rules/types/lint/build; backend 128 tests,
ruff/format/mypy; 9 Compose browser scenarios including scatter/table and immediate contrast.
Segmented colour changes are immediate; only scale animates. Reports and proofs are in
work/audits/full-product/progress-review.md and completion-checklist.md.
Remaining limits are data/calibration and physical-device/browser coverage, not unfinished controls.
Local stack remains at http://localhost:18080, API 18010. Product commit and push are complete; no deployment.


## Publication detail moved from session

The pre-push hook rejected bodies in imported ML commits. Their messages were reduced to subjects
in the pending branch history; author identities and every file tree were preserved. Remote source
branches were not changed. Original local tip: refs/backups/full-product-before-push (2d92a63).
Snapshot screenshots remain local under the repository screenshots/ ignore rule; source, docs,
plans and textual audit logs are published. Baseline publication complete.

