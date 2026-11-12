import { num } from "./panel.js"

const path = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join("")

export function chart(sim, selected, temporal, width, height) {
  const w = Math.max(width, 280)
  const h = Math.max(height, 160)
  const l = 46, r = w - 16, t = 24, b = h - 36
  const sensor = sim.sensors[selected]
  if (!sensor) return ""
  const history = sim.history
  const end = sim.leak ? Math.max(10, sim.leak.t0 + 10) : Math.max(10, sim.time)
  const start = sim.leak ? Math.max(0, sim.leak.t0 - 2) : Math.max(0, end - 30)
  const x = (v) => l + (v - (temporal ? start : 0)) / (temporal ? end - start : 12000) * (r - l)
  const lo = temporal ? sensor.model - 0.4 : 3.6
  const hi = temporal ? sensor.model + 0.05 : 5.1
  const y = (v) => b - (v - lo) / (hi - lo) * (b - t)
  const series = temporal ? history.filter((p) => p.time >= start).map((p) => [p.time, sensor.model, p.readings[selected]]) : Array.from(sim.model, (v, i) => [i / (sim.model.length - 1) * 12000, v, sim.measured[i]])
  const model = series.map(([xx, m]) => [x(xx), y(m)])
  const measured = series.map(([xx, , m]) => [x(xx), y(m)])
  const grid = [0, 0.5, 1].map((k) => {
    const v = lo + k * (hi - lo)
    return `<path class="ch-grid" d="M${l} ${y(v)}H${r}"/><text x="${l - 8}" y="${y(v) + 4}" text-anchor="end">${num(v, 1)}</text>`
  }).join("")
  const ticks = [0, 0.5, 1].map((k) => {
    const v = temporal ? start + k * (end - start) : k * 12000
    return `<text x="${x(v)}" y="${h - 16}" text-anchor="${k === 0 ? "start" : k === 1 ? "end" : "middle"}">${num(v, temporal ? 1 : 0)}</text>`
  }).join("")
  const threshold = temporal ? `<path class="ch-threshold" d="M${l} ${y(sensor.model - sim.threshold)}H${r}"/><text x="${r}" y="${y(sensor.model - sim.threshold) - 6}" text-anchor="end">порог ${num(sim.threshold)} МПа</text>` : ""
  const dots = temporal ? "" : sim.sensors.map((s, i) => `<circle data-sensor="${i}" class="chart-sensor" cx="${x(s.x)}" cy="${y(s.measured)}" r="${i === selected ? 5 : 3}"/><circle data-sensor="${i}" class="chart-hit" cx="${x(s.x)}" cy="${y(s.measured)}" r="14"/>`).join("")
  const events = temporal ? sim.events.filter((e) => ["insert", "leak"].includes(e.type) && e.time >= start).map((e) => `<path class="chart-event" data-tone="${e.type === "leak" ? "danger" : ""}" d="M${x(e.time)} ${t}V${b}"/><text x="${Math.min(r - 2, Math.max(l + 2, x(e.time) + 5))}" y="${e.type === "insert" ? t + 10 : t + 26}" text-anchor="${x(e.time) > r - 70 ? "end" : "start"}">${e.type === "insert" ? "вставка" : "найдена"}</text>`).join("") : ""
  const location = !temporal && sim.detection ? `<rect class="chart-zone" x="${x(sim.detection.x - sim.detection.spread) - 2}" y="${t}" width="${Math.max(4, sim.detection.spread / 12000 * 2 * (r - l))}" height="${b - t}"/>` : ""
  return `<svg class="ch live-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${temporal ? `Давление Д-0${sensor.id} во времени` : "Давление вдоль участка"}">${grid}<text x="${l}" y="14">МПа</text><path class="ch-axis" d="M${l} ${t}V${b}H${r}"/>${location}<path class="chart-gap" d="${path(model)}${path([...measured].reverse()).replace("M", "L")}Z"/><path class="ch-model" d="${path(model)}"/><path class="ch-measured" d="${path(measured)}"/>${threshold}${dots}${events}${ticks}<text x="${r}" y="${h - 2}" text-anchor="end">${temporal ? "время симуляции, с" : "расстояние, м"}</text></svg>`
}
