import { el, frame, hatch, label, leader, paper, path, render, scale, xAxis, yAxis } from "./doc-chart-kit.js"
import { num, px } from "./doc-read.js"

const LEAK_M = 6330
const THRESHOLD = 0.07
const INSERT_S = 17
const CROSS_S = 17.9
const CONFIRM_S = 19
const SENSORS = [0, 2400, 4800, 7200, 9600, 12000]

const model = (x) => 5 - 0.0717 * (x / 1000) - 0.0003 * (x / 1000) ** 2
const drop = (x) => 0.08 + 0.24 * (x < LEAK_M ? x / LEAK_M : (12000 - x) / (12000 - LEAK_M))
const measured = (x) => model(x) - drop(x)

function noise(t) {
  return 0.005 * Math.sin(t * 2.3) + 0.0035 * Math.sin(t * 5.9 + 1) + 0.0025 * Math.sin(t * 11.3 + 2)
}

export function residual(t) {
  const wave = t < 17.83 ? 0 : -0.3 * (1 - Math.exp(-(t - 17.83) / 0.22))
  return wave + noise(t)
}

function profile(host) {
  const small = host.clientWidth < 480
  const { svg, defs, box } = frame(host, { height: px(small ? "--chart-height-sm" : "--chart-height") + 48, right: 88 })
  const x = scale([0, 12000], [box.x0, box.x1])
  const y = scale([3.8, 5.1], [box.y1, box.y0])
  paper(svg, defs, box)
  yAxis(svg, box, y, small ? [4, 4.5, 5] : [3.8, 4.2, 4.6, 5], 1, "МПа")
  xAxis(svg, box, x, small ? [0, 6000, 12000] : [0, 2000, 4000, 6000, 8000, 10000, 12000], (t) => (t === 12000 ? "12 км" : num(t / 1000)))
  const xs = Array.from({ length: 61 }, (_, i) => i * 200)
  const gap = xs.filter((v) => drop(v) >= THRESHOLD)
  const area = `${path(gap.map((v) => [v, model(v)]), x, y)}${path(gap.reverse().map((v) => [v, measured(v)]), x, y).replace("M", "L")}Z`
  el("path", { class: "ch-fill-danger", d: area }, svg)
  el("path", { d: area, fill: hatch(defs, "danger") }, svg)
  el("path", { class: "ch-model", d: path(xs.map((v) => [v, model(v)]), x, y) }, svg)
  const points = SENSORS.map((v) => [v, measured(v)])
  el("path", { class: "ch-measured", d: path(points, x, y) }, svg)
  for (const [v, p] of points) el("circle", { class: "ch-dot", cx: x(v), cy: y(p), r: 4 }, svg)
  el("line", { class: "ch-event-danger", x1: x(LEAK_M), x2: x(LEAK_M), y1: box.y0, y2: box.y1 }, svg)
  leader(svg, [x(LEAK_M), y(measured(LEAK_M)) + 6], [x(LEAK_M) - 24, box.y1 - 30], ["Утечка на 6 330 м", "найдено 6 340 ± 50 м"])
  label(svg, box.x1 + 8, y(model(12000)) - 6, "Модель")
  label(svg, box.x1 + 8, y(measured(12000)) + 12, "Замер")
}

function residualChart(host) {
  const { svg, defs, box } = frame(host, { height: px("--chart-height") + 48, right: 88 })
  const x = scale([0, 30], [box.x0, box.x1])
  const y = scale([-0.35, 0.1], [box.y1, box.y0])
  paper(svg, defs, box)
  el("rect", { class: "ch-band", x: box.x0, width: box.x1 - box.x0, y: y(THRESHOLD), height: y(-THRESHOLD) - y(THRESHOLD) }, svg)
  yAxis(svg, box, y, [-0.3, -0.2, -0.1, 0, 0.1], 1, "МПа")
  xAxis(svg, box, x, [0, 5, 10, 15, 20, 25, 30], (t) => (t === 30 ? "30 с" : num(t)))
  el("line", { class: "ch-zero", x1: box.x0, x2: box.x1, y1: y(0), y2: y(0) }, svg)
  const ts = Array.from({ length: 301 }, (_, i) => i / 10)
  const over = ts.filter((t) => t >= CROSS_S)
  const area = `${path(over.map((t) => [t, -THRESHOLD]), x, y)}${path(over.reverse().map((t) => [t, residual(t)]), x, y).replace("M", "L")}Z`
  el("path", { class: "ch-fill-danger", d: area }, svg)
  el("path", { d: area, fill: hatch(defs, "danger") }, svg)
  const part = (from, to) => ts.filter((t) => t >= from && t <= to).map((t) => [t, residual(t)])
  el("path", { class: "ch-measured", d: path(part(0, CROSS_S), x, y) }, svg)
  el("path", { class: "ch-measured ch-line-warning", d: path(part(CROSS_S, CONFIRM_S), x, y) }, svg)
  el("path", { class: "ch-measured ch-line-danger", d: path(part(CONFIRM_S, 30), x, y) }, svg)
  el("line", { class: "ch-event", x1: x(INSERT_S), x2: x(INSERT_S), y1: box.y0, y2: box.y1 }, svg)
  el("line", { class: "ch-event-danger", x1: x(CONFIRM_S), x2: x(CONFIRM_S), y1: box.y0, y2: box.y1 }, svg)
  label(svg, x(INSERT_S) - 6, box.y0 + 12, "Вставлена", "ch-text ch-end")
  label(svg, x(CONFIRM_S) + 6, box.y0 + 12, "Обнаружено за 2,0 с")
  leader(svg, [x(CROSS_S + 0.2), y(-THRESHOLD)], [x(CROSS_S) - 30, y(-0.31)], ["выдержка 0,4 с", "и второй датчик"])
  label(svg, box.x1 + 8, y(THRESHOLD) + 4, "порог", "ch-text")
  label(svg, box.x1 + 8, y(residual(30)) + 4, "Д-04")
}

function timeline(host) {
  const { svg, box } = frame(host, { height: 112, top: 40, bottom: 32, right: 24, left: 24 })
  const x = scale([0, 30], [box.x0, box.x1])
  const mid = box.y0 + 16
  el("line", { class: "ch-axis", x1: box.x0, x2: box.x1, y1: mid, y2: mid }, svg)
  el("rect", { class: "ch-seg-warning", x: x(CROSS_S), y: mid - 4, width: x(CONFIRM_S) - x(CROSS_S), height: 8 }, svg)
  el("rect", { class: "ch-seg-danger", x: x(CONFIRM_S), y: mid - 4, width: x(30) - x(CONFIRM_S), height: 8 }, svg)
  const marks = [
    [INSERT_S, "Вставлена", "ch-event", "end"],
    [CONFIRM_S, "Утечка подтверждена", "ch-event-danger", "start"],
    [24.1, "Принята оператором", "ch-event", "start"],
  ]
  marks.forEach(([t, text, cls, anchor], i) => {
    el("line", { class: cls, x1: x(t), x2: x(t), y1: mid - 12 - (i === 2 ? 14 : 0), y2: mid + 12 }, svg)
    el("text", { class: "ch-label", x: x(t) + (anchor === "end" ? -6 : 6), y: mid - 16 - (i === 2 ? 14 : 0), "text-anchor": anchor }, svg, text)
  })
  xAxis(svg, box, x, [0, 10, 20, 30], (t) => `${num(t)} с`)
}

function spark(host) {
  const width = px("--sparkline-width")
  const height = px("--sparkline-height")
  const svg = el("svg", { class: "ch ch-spark", width, height, viewBox: `0 0 ${width} ${height}`, "aria-hidden": "true" }, host)
  const shift = Number(host.dataset.shift ?? 0)
  const x = scale([0, 30], [2, width - 4])
  const y = scale([-0.34, 0.1], [height - 2, 2])
  const ts = Array.from({ length: 61 }, (_, i) => i / 2)
  const v = (t) => (shift ? residual(t + shift) * Number(host.dataset.k ?? 1) : noise(t * 1.3))
  el("rect", { class: "ch-band", x: 0, width, y: y(THRESHOLD), height: y(-THRESHOLD) - y(THRESHOLD) }, svg)
  el("path", { class: "ch-spark-line", d: path(ts.map((t) => [t, v(t)]), x, y) }, svg)
  const last = v(30)
  const tone = last <= -THRESHOLD ? "ch-dot-danger" : last <= -0.045 ? "ch-dot-warning" : "ch-dot"
  el("circle", { class: tone, cx: x(30), cy: y(last), r: 3 }, svg)
}

render("[data-chart='profile']", profile)
render("[data-chart='residual']", residualChart)
render("[data-chart='timeline']", timeline)
for (const host of document.querySelectorAll("[data-spark]")) spark(host)
