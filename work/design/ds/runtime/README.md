# PipeTwin examples runtime

Run from the repository root:

```sh
npm --prefix frontend ci
python3 -m http.server 5178 --bind 127.0.0.1
```

Open `/work/design/ds/screens.html` or `/work/design/ds/scene.html`.
Both use local fonts and Three.js installed by the first command. No API or paid key is required.
The HTML examples are separate from the React application build.

`createSession(seed)` owns the physical baseline, synthetic sensors and detector. `advance(seconds)`
uses fixed simulation steps. `insert(meters)` permits one active leak, `accept()` records acceptance,
and `snapshot()` returns pressure arrays, sensor readings, detector estimate, event times and history.
Creating a new session resets the scenario.

The module worker accepts `init {state}`, `insert {x}`, `accept`, `reset` and `play`. It emits the
snapshot plus `paused`. It catches up elapsed monotonic time in bounded chunks before processing
commands. Rendering reads the snapshot through a stable facade and cannot advance the model.

Named preview states use seed 42 and stop at the requested event. They are calculated examples,
not performance measurements. The live scenario starts with the default route or Reset. History
retains the injection and detection window until reset, rather than scrolling the explanation away.

```sh
node --test work/design/ds/runtime/session.test.mjs
npm --prefix frontend run verify
npm --prefix frontend run e2e
```
