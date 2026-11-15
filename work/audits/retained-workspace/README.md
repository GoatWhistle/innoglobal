# Retained workspace

2026-11-15. User requested keeping only the combined inspection frontend.
Root / now renders it; the old inspection URL remains a compatibility entry.
Deleted gallery, four alternate compositions, old pipe/overview/priorities pages, seven unused
feature packages, unused controls, previews, dictionary entries and obsolete screen tests.
Data and model support pages remain connected to the workspace explanations. API/data unchanged.

Verification: 36 rules, types, lint, 375 tests, build pass (verify.log). Final Compose rebuild
on 18080 passed seven browser scenarios: baseline/delta/queue, range/reload, nominal/keyboard,
plus both themes at 375/1440. browser.log and PNG captures in this folder.
Current desktop dark and mobile light captures visually inspected. Chromium only.
Existing large Three.js chunk warning remains. Changes uncommitted on feat/redesign-oil.
