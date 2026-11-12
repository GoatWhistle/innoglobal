import { createSim, SEGMENT_M, SENSORS_M, WAVE_MS } from "./scene/sim.js"
import { createSession, preview } from "./runtime/session.js"

export { SEGMENT_M, WAVE_MS }
export { ARRIVE, HOLD, THRESHOLD } from "./scene/sim.js"

const report = preview("leak").snapshot()
const recording = createSession()
recording.advance(2)
recording.insert(6330)
const insertion = recording.snapshot().leak.t0
recording.advance(8)
const run = recording.snapshot()

export const LEAK_X = report.leak.x
export const FOUND_X = report.detection.x
export const SPREAD = report.detection.spread
export const DETECT_S = report.detection.seconds
export const T0 = -insertion
export const DT = 0.1
export const SENSORS = SENSORS_M.map((x, i) => ({
  id: `Д-0${i + 1}`, x, model: report.sensors[i].model,
}))
export const ARRIVAL = run.sensors.map((s) => s.arrival === null ? null : s.arrival - insertion)
export const CROSSING = run.sensors.map((s) => s.since === null ? null : s.since - insertion)
export const SERIES = SENSORS.map((s, i) => run.history.map((p) => s.model - p.readings[i]))

export const residualAt = (i, t) => {
  const values = SERIES[i]
  return values[Math.max(0, Math.min(values.length - 1, Math.round((t - T0) / DT)))]
}

export function profile(t, samples = 121) {
  const sim = createSim(() => 0.5)
  sim.advance(2)
  if (t !== null) { sim.insert(LEAK_X); sim.advance(Math.max(0, t)) }
  sim.sample()
  const at = (array, x) => {
    const f = x * (array.length - 1)
    const i = Math.min(Math.floor(f), array.length - 2)
    return array[i] + (array[i + 1] - array[i]) * (f - i)
  }
  return Array.from({ length: samples }, (_, i) => {
    const k = i / (samples - 1)
    return { x: k * SEGMENT_M, model: at(sim.model, k), measured: at(sim.measured, k) }
  })
}

const nf = new Map()
export const fmt = (v, digits = 2) => {
  if (!nf.has(digits)) nf.set(digits, new Intl.NumberFormat("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits }))
  return nf.get(digits).format(v)
}
export const unit = (v, u, digits = 2) => `${fmt(v, digits)} ${u}`

export function sensorState(i, t, detected) {
  if (detected && report.detection.pair.includes(i + 1)) return "leak"
  return residualAt(i, t) > 0.045 ? "watch" : "calm"
}
