import assert from "node:assert/strict"
import { test } from "node:test"
import { Vector3 } from "three"
import { createJet } from "./jet.js"
import { CUT, DIM, frame, nearestS, outerRadius, surface, toMeters, toS } from "./route.js"
import { shell } from "./shell.js"

test("meters map to the monitored span and back", () => {
  for (const meters of [60, 2400, 6330, 11940]) assert.ok(Math.abs(toMeters(toS(meters)) - meters) < 1e-6)
  assert.equal(toMeters(0), 60)
  assert.equal(toMeters(1), 11940)
})

test("a point on the pipe surface resolves to its own coordinate", () => {
  for (const meters of [300, 4100, 6330, 9900]) {
    const at = surface(meters)
    assert.ok(Math.abs(toMeters(nearestS(at.position)) - meters) < 40)
    const f = frame(at.s)
    assert.ok(Math.abs(at.position.distanceTo(f.center) - outerRadius(at.s)) < 1e-6)
    assert.ok(Math.abs(at.normal.dot(f.tangent)) < 1e-6)
  }
})

test("layers step down inside the cutaway", () => {
  assert.equal(outerRadius(0.25), DIM.jacket)
  assert.equal(outerRadius((CUT.jacket[0] + CUT.wool[0]) / 2), DIM.wool)
  assert.equal(outerRadius(0.5), DIM.steel)
})

test("shell faces point away from the solid", () => {
  const geometry = shell({ s0: 0.2, s1: 0.3, inner: 0.5, outer: 0.6, a0: 0.4, a1: 2.2 })
  const position = geometry.attributes.position, normal = geometry.attributes.normal, index = geometry.index
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), n = new Vector3()
  for (let i = 0; i < index.count; i += 3) {
    a.fromBufferAttribute(position, index.getX(i)); b.fromBufferAttribute(position, index.getX(i + 1)); c.fromBufferAttribute(position, index.getX(i + 2))
    const face = b.clone().sub(a).cross(c.clone().sub(a))
    if (face.lengthSq() < 1e-12) continue
    n.fromBufferAttribute(normal, index.getX(i))
    assert.ok(face.dot(n) > 0)
  }
})

test("jet lands in front of the hole and stays within its particle budget", () => {
  const jet = createJet(600)
  const at = surface(6330)
  jet.start(at.position, at.normal, at.tangent, 0)
  let clock = 0
  for (let i = 0; i < 240; i++) { clock += 1 / 60; jet.update(1 / 60, clock) }
  assert.ok(jet.landed)
  assert.ok(jet.alive > 100 && jet.alive <= 600)
  assert.ok(jet.impact.z > at.position.z + 0.8)
  assert.ok(Number.isFinite(jet.geometry.attributes.position.array[0]))
  jet.stop()
  for (let i = 0; i < 90; i++) { clock += 1 / 60; jet.update(1 / 60, clock) }
  assert.ok(jet.dripping)
  for (let i = 0; i < 900; i++) { clock += 1 / 60; jet.update(1 / 60, clock) }
  assert.equal(jet.alive, 0)
  assert.equal(jet.dripping, false)
})

test("jet strength follows the leak intensity", () => {
  const at = surface(6330)
  const run = (power) => {
    const jet = createJet(3200)
    jet.setPower(power)
    jet.start(at.position, at.normal, at.tangent, 0)
    let clock = 0, peak = 0
    for (let i = 0; i < 180; i++) { clock += 1 / 60; jet.update(1 / 60, clock); peak = Math.max(peak, jet.alive) }
    return { peak, reach: jet.impact.z - at.position.z, dripping: jet.dripping }
  }
  const seep = run(0.08), steady = run(1), strong = run(1.5)
  assert.ok(seep.peak < 40 && seep.dripping)
  assert.ok(steady.peak > seep.peak * 10)
  assert.ok(strong.reach > steady.reach)
})
