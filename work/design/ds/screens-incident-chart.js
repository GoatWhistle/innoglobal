import { dimension, hatch, leader, path, scale } from "./screens-chart.js"
import { ARRIVAL, CROSSING, DETECT_S, DT, fmt, FOUND_X, HOLD, SENSORS, SERIES, SPREAD, T0, THRESHOLD } from "./screens-data.js"

const PAIR = [2, 3]

export function residualChart(w, h) {
  const pad = { l: 52, r: 24, t: 44, b: 36 }
  const x = scale(-1, 6, pad.l, w - pad.r)
  const y = scale(0, 0.32, h - pad.b, pad.t)
  const hh = hatch("danger")
  const grid = [0, 0.1, 0.2, 0.3]
    .map((v) => `<path class="ch-grid" d="M${pad.l} ${y(v)}H${w - pad.r}"/><text class="ch-y" x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end">${fmt(v, 1)}</text>`)
    .join("")
  const ticks = [-1, 0, 1, 2, 3, 4, 5, 6]
    .map((t) => `<text x="${x(t)}" y="${h - pad.b + 20}" text-anchor="middle">${t} с</text><path class="ch-axis" d="M${x(t)} ${h - pad.b}v4"/>`)
    .join("")
  const lines = SERIES.map((s, i) => {
    const pts = s.map((v, k) => [T0 + k * DT, v]).filter(([t]) => t >= -1 && t <= 6)
    const tone = PAIR.includes(i) ? "danger" : ""
    return `<path class="ch-line" data-tone="${tone}" d="${path(pts.map(([t, v]) => [x(t), y(Math.max(v, 0))]))}"/>`
  })
  const holds = PAIR.map((i) => `<rect x="${x(CROSSING[i])}" y="${y(THRESHOLD) - 6}" width="${x(CROSSING[i] + HOLD) - x(CROSSING[i])}" height="12" fill="url(#${hh.id})" class="ch-hold"/>`).join("")
  const arrivals = PAIR.map((i) => {
    const t = ARRIVAL[i]
    return `<circle class="ch-dot" data-tone="danger" cx="${x(t)}" cy="${y(0.045)}" r="3.5"/>`
  }).join("")
  const labels = [
    leader(x(ARRIVAL[3]), y(0.045), `${SENSORS[3].id}: волна ${fmt(ARRIVAL[3])} с`, { dir: -1, dy: 64, dx: 16 }),
    leader(x(ARRIVAL[2]), y(0.045), `${SENSORS[2].id}: волна ${fmt(ARRIVAL[2])} с`, { dir: 1, dy: 96, dx: 40 }),
    leader(x(DETECT_S), y(0.255), `Подтверждено, ${fmt(DETECT_S, 1)} с`, { tone: "danger", dir: 1, dy: 36, dx: 40 }),
  ].join("")
  const others = [0, 1, 4, 5]
    .map((i) => `<text class="ch-sub" x="${w - pad.r + 4}" y="${y(SERIES[i].at(-1)) + 4}">${SENSORS[i].id}</text>`)
    .join("")
  return `<svg class="ch" width="${w}" height="${h}" role="img" aria-label="Невязка по датчикам после вставки утечки"><defs>${hh.def}</defs>
${grid}<text class="ch-y" x="${pad.l - 8}" y="${pad.t - 12}" text-anchor="end">МПа</text>
<path class="ch-threshold" d="M${pad.l} ${y(THRESHOLD)}H${w - pad.r}"/><text x="${pad.l + 6}" y="${y(THRESHOLD) - 6}">порог ${fmt(THRESHOLD)} МПа</text>
<path class="ch-axis" d="M${pad.l} ${h - pad.b}H${w - pad.r}"/>${ticks}
<path class="ch-center" data-tone="ink" d="M${x(0)} ${pad.t - 20}V${h - pad.b}"/><path class="ch-center" d="M${x(DETECT_S)} ${pad.t - 20}V${h - pad.b}"/>
${dimension(x(0), x(DETECT_S), pad.t - 22, `${fmt(DETECT_S, 1)} с до тревоги`)}
${holds}${lines.join("")}${arrivals}${labels}${others}</svg>`
}

export function locationSchema(w, h) {
  const a = SENSORS[2].x
  const b = SENSORS[3].x
  const x = scale(a - 300, b + 300, 16, w - 16)
  const py = h / 2
  const cx = x(FOUND_X)
  const half = Math.max(3, x(FOUND_X + SPREAD) - cx)
  const sensor = (s) => `<g class="ch-sensor" data-state="leak"><path d="M${x(s.x)} ${py - 12}V${py + 12}"/><circle cx="${x(s.x)}" cy="${py - 30}" r="9"/><text x="${x(s.x)}" y="${py - 26}" text-anchor="middle" class="ch-sensor-n">${s.id.slice(-1)}</text></g>`
  return `<svg class="ch loc" width="${w}" height="${h}" role="img" aria-label="Место утечки ${fmt(FOUND_X, 0)} м между Д-03 и Д-04">
<path class="loc-pipe" d="M0 ${py - 8}H${w}M0 ${py + 8}H${w}"/><path class="ch-center" data-tone="ink" d="M0 ${py}H${w}"/>
<rect class="ch-zone" x="${cx - half}" y="${py - 8}" width="${half * 2}" height="16"/>
<path class="ch-center" d="M${cx} ${py - 44}V${py + 36}"/>
${sensor(SENSORS[2])}${sensor(SENSORS[3])}
${dimension(x(a), cx, py + 30, `${fmt(FOUND_X - a, 0)} м`)}${dimension(cx, x(b), py + 30, `${fmt(b - FOUND_X, 0)} м`)}
<text x="${cx}" y="${py - 50}" text-anchor="middle" class="loc-label">${fmt(FOUND_X, 0)} м ± ${SPREAD}</text></svg>`
}
