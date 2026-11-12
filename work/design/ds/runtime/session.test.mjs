import assert from "node:assert/strict"
import { test } from "node:test"
import { createSession, preview } from "./session.js"

test("normal simulation does not report leaks", () => {
  const session = createSession()
  session.advance(120)
  assert.equal(session.snapshot().phase, "calm")
  assert.equal(session.snapshot().detection, null)
})

for (const x of [60, 1800, 6330, 9000, 11940]) {
  test(`detects a leak at ${x} from two held sensor crossings`, () => {
    const session = createSession()
    session.advance(2)
    session.insert(x)
    session.advance(15)
    const s = session.snapshot()
    assert.ok(s.detection)
    const insertion = s.events.find((e) => e.type === "insert")
    const found = s.events.find((e) => e.type === "leak")
    assert.ok(Math.abs(s.detection.seconds - (found.time - insertion.time)) < 1e-8)
    assert.ok(s.detection.seconds > s.hold)
    assert.ok(s.detection.x >= 0 && s.detection.x <= 12000)
    assert.ok(s.sensors.filter((v) => v.tripped).length >= 2)
  })
}

test("simulation time is independent of delivery cadence", () => {
  const a = createSession(), b = createSession()
  a.advance(2); b.advance(2)
  a.insert(6330); b.insert(6330)
  a.advance(30)
  for (let i = 0; i < 300; i++) b.advance(0.1)
  assert.deepEqual(a.snapshot().detection, b.snapshot().detection)
  assert.equal(a.snapshot().time, b.snapshot().time)
})

test("preview states are calculated and acceptance keeps the detection", () => {
  assert.equal(preview("watch").snapshot().detection, null)
  assert.equal(preview("watch").snapshot().phase, "watch")
  const s = preview("leak")
  const before = s.snapshot().detection
  s.accept(); s.accept()
  assert.equal(s.snapshot().phase, "ack")
  assert.deepEqual(s.snapshot().detection, before)
  assert.equal(s.snapshot().events.filter((e) => e.type === "ack").length, 1)
})

test("invalid and duplicate insertions do not alter an active scenario", () => {
  const s = createSession()
  s.insert(NaN)
  assert.equal(s.snapshot().leak, null)
  s.insert(6330); s.insert(9000)
  assert.equal(s.snapshot().leak.x, 6330)
  assert.equal(s.snapshot().events.length, 1)
})

test("the detection explanation remains available after a long observation", () => {
  const s = createSession()
  s.advance(70)
  s.insert(6330)
  s.advance(120)
  const snapshot = s.snapshot()
  assert.ok(snapshot.history[0].time <= snapshot.leak.t0)
  assert.ok(snapshot.history.at(-1).time <= snapshot.leak.t0 + 10.01)
  assert.ok(snapshot.events.find((e) => e.type === "leak"))
})
