import { createSession } from "./runtime/session.js"
import { meters } from "./runtime/scheme.js"
import { path, scale } from "./screens-chart.js"
import { fmt } from "./screens-data.js"

export const SILENT = { index: 5, seconds: 47 }

export function capture(leak) {
  const session = createSession()
  session.advance(leak ? 22 : 60)
  let t0 = null
  if (leak) {
    session.insert(6330)
    t0 = session.snapshot().leak.t0
    session.advance(8)
  }
  return { snap: session.snapshot(), t0 }
}

export function stateOf(snap, i, silent) {
  if (silent && i === SILENT.index) return "silent"
  const s = snap.sensors[i]
  return s.state === 2 ? "leak" : s.state === 1 ? "watch" : "calm"
}

export function neighbours(i) {
  return [i - 1, i + 1].filter((j) => j >= 0 && j < 6).map((j) => `Д-0${j + 1}`).join(" и ")
}

export function residualChart({ snap, t0 }, i, silent) {
  return (w, h) => {
    const pad = { l: 52, r: 16, t: 28, b: 36 }
    const end = snap.time
    const span = t0 === null ? 60 : 10
    const start = end - span
    const cut = silent ? end - SILENT.seconds : end
    const x = scale(start, end, pad.l, w - pad.r)
    const y = scale(-0.05, 0.35, h - pad.b, pad.t)
    const model = snap.sensors[i].model
    const points = snap.history.filter((p) => p.time >= start && p.time <= cut).map((p) => [x(p.time), y(model - p.readings[i])])
    const grid = [0, 0.1, 0.2, 0.3].map((v) => `<path class="ch-grid" d="M${pad.l} ${y(v)}H${w - pad.r}"/><text class="ch-y" x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end">${fmt(v, 1)}</text>`).join("")
    const ticks = [0, 0.5, 1].map((k) => `<text x="${x(start + k * span)}" y="${h - 12}" text-anchor="${k === 0 ? "start" : k === 1 ? "end" : "middle"}">${k === 1 ? "сейчас" : `${fmt(span - k * span, 0)} с назад`}</text>`).join("")
    const limit = `<path class="ch-threshold" d="M${pad.l} ${y(snap.threshold)}H${w - pad.r}"/><text x="${w - pad.r}" y="${y(snap.threshold) - 6}" text-anchor="end">порог ${fmt(snap.threshold)} МПа</text>`
    const found = snap.events.find((e) => e.type === "leak")
    const marks = t0 === null ? "" : `<path class="ch-center" data-tone="ink" d="M${x(t0)} ${pad.t}V${h - pad.b}"/><text x="${x(t0) - 6}" y="${pad.t - 10}" text-anchor="end">вставка</text>${found ? `<path class="ch-center" d="M${x(found.time)} ${pad.t}V${h - pad.b}"/><text x="${x(found.time) + 6}" y="${pad.t - 10}">найдена</text>` : ""}`
    const gap = silent ? `<rect class="ch-band" x="${x(cut)}" y="${pad.t}" width="${x(end) - x(cut)}" height="${h - pad.b - pad.t}"/><text x="${(x(cut) + x(end)) / 2}" y="${y(0.15)}" text-anchor="middle">нет данных ${SILENT.seconds} с</text>` : ""
    return `<svg class="ch" width="${w}" height="${h}" role="img" aria-label="Расхождение модели и показаний Д-0${i + 1} за ${span} с">${grid}<text class="ch-y ch-unit" x="${pad.l - 8}" y="${pad.t - 12}" text-anchor="end">МПа</text>${gap}<path class="ch-axis" d="M${pad.l} ${h - pad.b}H${w - pad.r}"/>${limit}${marks}<path class="ch-measured" d="${path(points)}"/>${ticks}</svg>`
  }
}

export function location(snap, i) {
  const at = snap.sensors[i].x
  return at === 0 ? "начало участка, 0 м" : at === 12000 ? "конец участка, 12 000 м" : `${meters(at)} от начала`
}
