Approved: open directly on 3D pipe; retain illustrative circumferential shape with explicit caption.
Branch feat/redesign-oil, HEAD dbb9a47. Restoration is uncommitted. Original Three.js steel, welds,
supports and oil restored with real API values. Root opens pipe, overview at /overview. All three
cameras, projected tags, matte readout, marking, coordinate controls, shared profile/strip,
dimensioned sheet/stamp, disclosure and priorities implemented. Other pages use engineering sheets.
Canvas2D/SVG fallback preserves all three modes and selection. IDs no longer assume array indices.
Frontend verify: 36 rules, types, lint, 372 tests, build pass. Backend: ruff, mypy, 128 tests pass.
Compose frontend rebuilt and running at localhost:18080; backend 18010. Export byte-equal to result.csv.
Production browser matrix passed after isolating test artifact folders; see work/audits/frontend-1.md.
Chunk >500 kB and existing PostCSS warning remain. Do not change the original design catalog.
