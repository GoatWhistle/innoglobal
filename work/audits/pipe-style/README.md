# Pipe-led screen verification, 2026-11-14

Method: `node work/design/ds/wall/tests/browser.mjs` against the static server on 5178, Playwright
Chromium headless with SwiftShader (software GL). Raw output: `results.txt`, `matrix.json`, screenshots.

## Passed

- Strip keyboard (arrows, Page Up/Down, Home/End), coordinate input and validation.
- Mouse chain: route click selects, camera key to unroll, click on the thin spot cuts the pipe into
  section near segment 630; the sheet's left edge aligns with the profile axis within 3 px.
- Keyboard chain: camera keys with arrows and 1/2/3; selection kept across scales and theme change.
- Case 2 partial final segment (8 375 m → segment 837); priority list of 84 rows.
- Real WebGL context loss, forced `?state=nogl` and a blocked renderer module all fall back to SVG;
  all three scales render and a sheet click still cuts the pipe.
- Reduced motion: unroll is flat immediately, no flight.
- Loading, empty and error recover; missing data hides the observed legend.
- Matrix: screen (3 scales) and catalog at 375, 768, 1440 in both themes, 24 views:
  no horizontal overflow, no axe violations (WCAG 2.0/2.1 A and AA). No page errors.
- Unit: `wall/tests/field.test.mjs` (ring minimum equals forecast, relative scale, labels, store).
- `npm --prefix frontend run verify` passed (docs changed, no React source changed).

## Materials pass, 2026-11-14

Steel, welds, supports, ground shadow, chamfered cut and oil face added. Same browser suite rerun:
all scenarios passed, 24-view matrix without overflow or axe violations, no page errors.
Real Chrome on the author's machine (hardware GPU, 1512×771): transitions route, unroll, section at
median 8.3 ms and p95 about 10 ms per frame over 120–150 frames each. SwiftShader median rose to
200 ms, p95 250 ms (software only).

## Limitations

- Unroll frame timing under SwiftShader: median about 50–67 ms, p95 about 200 ms. This is software
  rendering, not a hardware GPU measurement; one hardware measurement is in the materials pass above.
- The 375 px dark full-page catalog screenshot fails to capture in headless Chromium (page height);
  its overflow and axe checks still ran. One matrix screenshot of the 375 px light section was
  captured blank in the matrix run while a standalone capture renders correctly; the cause was not
  investigated.
- 1920 px was not in the automated matrix; visual review covered 1440 and 375 by eye.
- The circumferential distribution and all thickness values are synthetic.

## Oil flow in the section (2026-11-14)

Oil in the cut now moves: crossfaded noise layers advance at `(1 − r²)` speed, so the centre
changes over about 9 s and the wall stays still. Continuous frames only while the cut is visible,
dark theme, motion allowed. Hardware Chrome, section view: rAF interval median 8.3 ms, p95 9.2 ms
(180 frames, 120 Hz display). Wall browser script passed (reduced motion, context loss, 2D, matrix,
axe, no page errors); one 375 dark pipe-kit screenshot capture failed with a protocol error.

