import { createSim, SEGMENT_M, SENSORS_M, WAVE_MS } from "./scene/sim.js"

export { SEGMENT_M, WAVE_MS }

export const LEAK_X = 6330
export const FOUND_X = 6340
export const SPREAD = 42
export const DETECT_S = 2
export const THRESHOLD = 0.07
export const ARRIVE = 0.045
export const HOLD = 0.4
export const T0 = -2
export const DT = 0.2

const MODEL = createSim().model

export const SENSORS = SENSORS_M.map((x, i) => ({
  id: `Д-0${i + 1}`,
  x,
  model: MODEL[Math.round((x / SEGMENT_M) * (MODEL.length - 1))],
}))

export const ARRIVAL = [6.2, 3.8, 1.55, 0.9, 3.2, 5.6]
export const CROSSING = [6.45, 3.87, 1.6, 0.95, 3.27, 5.88]

const raw = [
  "6,7,9,10,8,6,5,3,2,1,1,1,1,0,1,-1,-2,-3,-3,-3,-3,-2,-2,-1,0,-2,-1,-4,-5,-6,-7,-7,-6,-4,-1,2,7,8,9,9,14,46,67,76,80,81,81,81,81,80",
  "-2,-1,1,2,2,3,1,-1,-4,-5,-7,-8,-8,-8,-5,-4,-2,0,2,2,3,4,4,5,5,7,8,7,7,46,110,144,159,164,164,165,166,168,170,171,172,172,172,171,169,167,166,164,163,164",
  "-7,-6,-4,-2,1,3,6,9,10,10,9,6,3,2,0,-1,-2,5,111,192,233,251,258,259,260,259,258,258,258,258,258,258,258,258,257,256,257,258,258,259,263,266,268,272,271,271,272,269,266,263",
  "3,1,1,0,-1,0,-1,0,1,1,1,2,0,-3,23,138,213,246,262,271,275,279,283,286,288,290,291,290,290,288,287,287,288,288,288,287,287,286,284,282,281,281,280,280,282,284,284,284,284,282",
  "-7,-7,-5,-5,-5,-4,-3,-2,-2,0,3,4,6,8,9,8,6,6,3,0,-1,-2,-2,-1,0,1,65,129,161,174,177,179,177,176,175,175,175,176,176,178,177,178,179,180,181,183,184,187,189,190",
  "2,1,1,2,3,4,3,4,4,4,3,2,1,-1,-1,-1,-1,-2,-3,-4,-5,-7,-8,-10,-10,-8,-5,-3,1,5,6,8,8,8,6,5,3,14,46,65,75,80,82,82,82,81,81,80,78,79",
]

export const SERIES = raw.map((row) => row.split(",").map((v) => Number(v) / 1000))

export const residualAt = (i, t) => {
  const s = SERIES[i]
  const k = Math.max(0, Math.min(s.length - 1, Math.round((t - T0) / DT)))
  return s[k]
}

const amplitude = (x) => {
  const shape = x < LEAK_X ? x / LEAK_X : (SEGMENT_M - x) / (SEGMENT_M - LEAK_X)
  return 0.32 * (0.25 + 0.75 * shape)
}

const rise = (x, t) => {
  const tau = t - Math.abs(x - LEAK_X) / WAVE_MS
  return tau <= 0 ? 0 : 1 - Math.exp(-tau / 0.22)
}

const ripple = (x) => 0.004 * Math.sin(x * 0.0011 + 2.1) + 0.003 * Math.sin(x * 0.0029 - 0.7)

export function profile(t, samples = 121) {
  const out = []
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * SEGMENT_M
    const f = (x / SEGMENT_M) * (MODEL.length - 1)
    const j = Math.min(Math.floor(f), MODEL.length - 2)
    const model = MODEL[j] + (MODEL[j + 1] - MODEL[j]) * (f - j)
    const drop = t === null ? 0 : amplitude(x) * rise(x, t)
    out.push({ x, model, measured: model + ripple(x) - drop })
  }
  return out
}

const nf = new Map()
export const fmt = (v, digits = 2) => {
  if (!nf.has(digits))
    nf.set(digits, new Intl.NumberFormat("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits }))
  return nf.get(digits).format(v)
}

export const unit = (v, u, digits = 2) => `${fmt(v, digits)} ${u}`

export function sensorState(i, t, detected) {
  const r = residualAt(i, t)
  if (detected && (i === 2 || i === 3)) return "leak"
  if (r > ARRIVE) return "watch"
  return "calm"
}
