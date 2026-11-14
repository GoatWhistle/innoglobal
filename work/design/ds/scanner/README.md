# Wall scanner

Serve the repository root: `python3 -m http.server 5178 --bind 127.0.0.1`.
Install existing frontend dependencies first with `npm --prefix frontend ci`.
Open `/work/design/ds/screen-thickness.html`. The page uses only local dependencies.

## Data contract

The catalog uses `makeExample(caseId, state)` and `createStore()`. The model is a deterministic
illustration, not a degradation predictor. Pipeline 1: 12,000 m, nominal 8 mm. Pipeline 2: 8,375 m,
nominal 6 mm; the final segment is five metres. These lengths are synthetic, not organizer data.

A pipeline has `id`, `caseId`, `lengthM`, `nominalMm`, `diameterMm`, `baselineDate`, `targetDate`,
`source` and `segments`. Each segment has `id`, `startM`, `endM`, `baselineMm`, `predictedMm`,
nullable `observedMm`, nullable `p10Mm`/`p90Mm`, and nullable contextual `factors`.
Segment ids are floor(distance / 10), with intervals [start, end); the pipe endpoint selects the
last interval. Data from a future API will be adapted here; this is not an HTTP schema.

`createScannerEngine(canvas, callbacks)` receives `onSelect(meters)`, `onProject(point)` and
`onFailure(reason)`; exposes `setData`, `selectSegment`, `setTheme`, `resize`, `setOrbit`, `home`,
`stats`, `dispose`. It imports pipe geometry/material factories directly, never the leak engine.
The main UI and 2D fallback load independently of the Three.js module.

The store is the only selection owner. Theme does not reset it; pipe changes select segment zero.
Ranking takes ceil(segment count × 0.1), ascending predicted thickness, ties by segment id.
It neither estimates failure probability nor establishes a safe thickness threshold.

## Synthetic method

For normalized distance x at the segment midpoint, a smooth periodic exposure plus three Gaussian
loss lobes determines the displayed minimum. `data.js` contains the complete formula. The previous
VTD example is nominal minus half this loss; commissioning uses nominal directly. The uncertainty
range is a deterministic illustrative spread, not a calibrated quantile estimate. Context factors
are generated for the UI and are not causal explanations.

## States

`?case=2`: commissioning case. `?state=missing`: no prior measured baseline for case 1, interval or
factors. `?state=loading|empty|error`: recoverable catalog specimens. `?state=nogl`: force the 2D
scheme. Real context loss also enables fallback. No backend or paid key is used.

## Verification

```sh
node --test work/design/ds/scanner/tests/state.test.mjs
node --loader ./work/design/ds/scanner/tests/three-loader.mjs --test work/design/ds/experiments/geometry.test.mjs work/design/ds/pipeline/pipeline.test.mjs work/design/ds/runtime/session.test.mjs work/design/ds/scanner/tests/state.test.mjs
node work/design/ds/scanner/tests/browser.mjs
npm --prefix frontend run verify
```

The browser script requires the static server on port 5178 and installed Playwright Chromium.
It writes screenshots and results under `work/audits/scanner/`.

Headless Chromium may use software SwiftShader. Its timing is not a measurement of hardware GPU
performance. The latest methods, measurements and limitations are in `work/audits/scanner/README.md`.
