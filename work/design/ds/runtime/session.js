import { ARRIVE, createSim, HOLD, THRESHOLD } from "../scene/sim.js"

export function seeded(seed = 42) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

export function createSession(seed = 42) {
  const sim = createSim(seeded(seed))
  const events = []
  const history = []
  let accepted = null
  let phase = "calm"
  let nextSample = 0
  function record(type) {
    events.push({ type, time: sim.time })
  }
  function advance(dt) {
    let left = dt
    while (left > 0.000001) {
      const step = Math.min(0.01, left)
      sim.advance(step)
      left -= step
      const max = Math.max(...sim.sensors.map((s) => s.residual))
      const next = accepted !== null ? "ack" : sim.detection ? "leak" : max > ARRIVE ? "watch" : sim.leak && max > 0.02 ? "deviation" : sim.leak ? "search" : "calm"
      if (next !== phase) {
        phase = next
        record(next)
      }
      if (sim.time + 0.000001 >= nextSample) {
        if (!sim.leak || sim.time <= sim.leak.t0 + 10) history.push({ time: sim.time, readings: sim.sensors.map((s) => s.measured ?? 0) })
        if (history.length > 600) history.shift()
        nextSample += 0.1
      }
    }
    sim.sample()
  }
  return {
    sim,
    advance,
    insert(x) {
      if (sim.leak || !Number.isFinite(x)) return
      sim.insert(x)
      while (history.length && history[0].time < sim.time - 2) history.shift()
      record("insert")
    },
    accept() {
      if (!sim.detection || accepted !== null) return
      accepted = sim.time
      record("ack")
      phase = "ack"
    },
    snapshot() {
      return {
        time: sim.time, age: sim.age, leak: sim.leak, detection: sim.detection,
        model: sim.model, measured: sim.measured, sensors: sim.sensors,
        fronts: sim.fronts(), flow: sim.flowShare(), phase, accepted,
        events: [...events], history: [...history], threshold: THRESHOLD, hold: HOLD,
      }
    },
  }
}

export function preview(state) {
  const session = createSession()
  session.advance(2)
  if (!["watch", "leak", "ack", "search"].includes(state)) return session
  session.insert(6330)
  for (let i = 0; i < 2000; i++) {
    session.advance(0.01)
    const s = session.snapshot()
    if (state === "search" || (state === "watch" && s.phase === "watch") || s.detection) break
  }
  if (state === "ack") session.accept()
  return session
}
