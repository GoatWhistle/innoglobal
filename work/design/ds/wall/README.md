# Pipe-led screen: route, unroll, section

Implements `work/design/pipe-style-plan.md`. Serve the repository root on port 5178
(`python3 -m http.server 5178 --bind 127.0.0.1`) with `frontend/node_modules` installed.

- Screen: `/work/design/ds/screen-pipe.html`. `?state=route|unroll|section` opens a scale;
  `?case=2`, `?state=missing|loading|empty|error|nogl` as in the scanner.
- Catalog and foundations: `/work/design/ds/pipe-kit.html`.

## Modules

| File | Role |
|---|---|
| `state.js` | Store: pipeline, selected segment, picked hour, mode. Single owner of selection |
| `field.js` | Synthetic circumferential thickness, relative scale, picket and clock labels |
| `engine.js`, `camera.js`, `shaders.js` | Three.js renderer: unroll shader with steel, welds and corrosion, camera flights, analytic picking |
| `shaders-cut.js` | Chamfered cut ring and oil face |
| `props.js` | Supports and ground with shadow; dissolve during unroll |
| `renderer.js` | Separate entry that registers the engine; the page works without it |
| `stage.js` | Mounts the engine or the SVG fallback, places tags and sheet axes |
| `strip.js` | Segment strip slider |
| `drawing.js`, `flat.js` | Section drawing, dimension line, stamp; SVG route and sheet fallback |
| `view.js`, `main.js` | DOM updates and wiring |
| `metrics.js` | Shared sheet insets (36/18 px) for sheet, strip and profile alignment |

## Data honesty

Segment forecasts come from `scanner/data.js` (synthetic). The ring keeps the segment forecast as
its minimum at `lossHour`; the angular shape is an illustration rule, not a measurement. Colour is
relative to the thinnest segment of the pipe and is not a threshold.

## Checks

```sh
node --test work/design/ds/wall/tests/field.test.mjs
node work/design/ds/wall/tests/browser.mjs
```

The browser script needs the static server and Playwright Chromium; it writes screenshots,
`matrix.json` and `results.txt` to `work/audits/pipe-style/`.
