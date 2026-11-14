export const HOURS = 48

const TAU = Math.PI * 2
const circular = (a, b) => { const d = Math.abs(a - b) % 12; return Math.min(d, 12 - d) }

export function lossHour(pipeline, segment) {
  const x = ((segment.startM + segment.endM) / 2) / pipeline.lengthM
  return (6 + 1.25 * Math.sin(x * TAU * 2.7) + 0.55 * Math.sin(x * TAU * 8.4) + 12) % 12
}

function spread(pipeline, segment) {
  const x = ((segment.startM + segment.endM) / 2) / pipeline.lengthM
  return 1.15 + 0.55 * Math.sin(x * TAU * 4.9) ** 2
}

export function wallAt(pipeline, segment, hour) {
  const loss = pipeline.nominalMm - segment.predictedMm
  const d = circular(hour, lossHour(pipeline, segment)), s = spread(pipeline, segment)
  return pipeline.nominalMm - loss * (0.22 + 0.78 * Math.exp(-((d / s) ** 2)))
}

export function ring(pipeline, segment, count = 96) {
  return Array.from({ length: count }, (_, i) => wallAt(pipeline, segment, i / count * 12))
}

export function thinnest(pipeline) {
  return pipeline.segments.reduce((min, s) => Math.min(min, s.predictedMm), pipeline.nominalMm)
}

export function relative(pipeline, mm, floor = thinnest(pipeline)) {
  const span = Math.max(0.01, pipeline.nominalMm - floor)
  return Math.max(0, Math.min(1, (pipeline.nominalMm - mm) / span))
}

export function fieldData(pipeline) {
  const width = pipeline.segments.length, floor = thinnest(pipeline)
  const data = new Uint8Array(width * HOURS * 4)
  for (let h = 0; h < HOURS; h++) for (let i = 0; i < width; i++) {
    const value = relative(pipeline, wallAt(pipeline, pipeline.segments[i], h / HOURS * 12), floor)
    const k = (h * width + i) * 4
    data[k] = Math.round(value * 255); data[k + 1] = 0; data[k + 2] = 0; data[k + 3] = 255
  }
  return { data, width, height: HOURS }
}

export const clock = (hour) => {
  const h = Math.round(hour * 2) / 2 % 12
  const whole = Math.floor(h) || 12
  return h % 1 ? `${whole}:30` : `${whole}:00`
}

export const picket = (meters) => {
  const m = Math.round(meters)
  return `ПК ${Math.floor(m / 100)}+${String(m % 100).padStart(2, '0')}`
}
