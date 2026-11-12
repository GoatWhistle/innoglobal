# Scene concepts (v3)

Why v1/v2 failed: too many objects competing (glass lens, piezometer columns, jets, puddles, HUD
tags, console), effects without meaning, and a pale object that dissolved on paper. The fix is one
object, one chart, one event, and colour that appears only where oil escapes.

## A. Piezometric curtain (chosen)

- Camera: long lens (fov about 20), low frontal three-quarter view, slow parallax only. The pipe
  bleeds off both edges; the monitored 12 km segment sits between two quiet scale marks.
- Object: a black lacquered steel pipe lit like a product shot (custom studio softboxes, long
  specular strips, contact shadow). It stays black in both themes, so on paper it is ink with full
  presence and on black it is defined by its highlights.
- Pressure: above the pipe stands a thin translucent "curtain" whose top edge is the hydraulic grade
  line. The digital twin's model (Darcy-Weisbach with Shukhov cooling, so slightly curved) is a
  hairline; the measured line is a solid stroke. Fine vertical rulings inside the curtain drift
  downstream at flow speed: that is the flow.
- Oil: a cutaway window runs along the monitored segment; through it the crude is black, viscous
  and glossy, its long wavy highlights sliding downstream (slower past the leak once it opens).
- Leak: click a point on the pipe. A puncture opens on the front face, a thin viscous stream pours
  from it and a black glossy pool spreads on the ground with slow ripples (oil as oil: no neon).
  Two pressure-wave rings run along the pipe at 1 050 m/s; behind them the measured line sinks into
  a kinked V whose apex points at the leak. The gap between model and measured is hatched amber
  (suspicion) and sensor collars turn amber as the wave reaches them; oxblood is reserved for the
  leak itself: the two bracketing sensors, the location hairline and the timer.
- Detection: when two sensors hold, the location is computed from wave arrival times
  (x = (xa + xb) / 2 + c (ta - tb) / 2), a hairline drops there and a giant thin timer freezes.
- Light theme: paper ground, ink curtain, black pipe, black glossy pool on paper.
- Camera: right mouse drag orbits left and right within a clamp, released it glides back.
- Absent: glass, particles, jets, puddles with neon edges, HUD tags, dashboards, rotating badges,
  design-system text.

## B. Bore view

- Camera inside the pipe, looking downstream down the bore; the oil moves toward a vanishing point.
- Pressure as glowing rings at sensor stations, ring diameter equals pressure.
- Leak: daylight breaking through a puncture in the wall, rings ahead of it collapse in sequence.
- Strong mood, but location along 12 km is hard to read, the model vs measured comparison is lost
  and on mobile it becomes a tunnel screensaver. Light theme would need an inverted world.

## C. Oil field

- Top-down plan view; the pipe is a thin black line across a full-bleed monopo-like oil fluid.
- Pressure is a heat field along the line; the leak bends the fluid into a vortex.
- Most "monopo", least legible: the fluid is decoration in calm state, colour appears without an
  event (breaking the brand rule), and two pressure series cannot be compared at a glance.

## Choice

A. It makes the detection algorithm itself the picture: two lines that agree, a wave that makes them
disagree, a V that points at the leak, sensors that light in arrival order, a timer. All the craft
goes into three things (lacquer pipe, curtain, oil film) instead of ten gimmicks, colour keeps its
meaning, and a black object on paper solves the light theme instead of fighting it.
