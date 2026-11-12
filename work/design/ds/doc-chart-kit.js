import { num, raw } from "./doc-read.js"

const NS = "http://www.w3.org/2000/svg"
let serial = 0

export function el(tag, attrs, parent, text) {
  const node = document.createElementNS(NS, tag)
  for (const [key, value] of Object.entries(attrs ?? {})) node.setAttribute(key, String(value))
  if (text !== undefined) node.textContent = text
  parent?.append(node)
  return node
}

export function scale([d0, d1], [r0, r1]) {
  const k = (r1 - r0) / (d1 - d0)
  return (v) => r0 + (v - d0) * k
}

export function path(points, x, y) {
  return points.map(([a, b], i) => `${i ? "L" : "M"}${x(a).toFixed(1)} ${y(b).toFixed(1)}`).join("")
}

export function frame(host, { height, top = 28, right = 72, bottom = 32, left = 48 }) {
  host.replaceChildren()
  const width = Math.max(280, host.clientWidth)
  const svg = el("svg", { class: "ch", width, height, viewBox: `0 0 ${width} ${height}` }, host)
  const box = { x0: left, x1: width - right, y0: top, y1: height - bottom, width, height }
  return { svg, box, defs: el("defs", {}, svg) }
}

export function hatch(defs, tone) {
  const id = `hatch-${tone}-${serial++}`
  const step = Number.parseFloat(raw("--hatch-spacing")) || 6
  const angle = Number.parseFloat(raw("--hatch-angle")) || 45
  const pattern = el("pattern", {
    id,
    width: step,
    height: step,
    patternUnits: "userSpaceOnUse",
    patternTransform: `rotate(${angle})`,
  }, defs)
  el("line", { class: `ch-hatch-${tone}`, x1: step / 2, y1: 0, x2: step / 2, y2: step }, pattern)
  return `url(#${id})`
}

export function paper(svg, defs, box) {
  const cell = Number.parseFloat(raw("--paper-cell")) || 8
  const major = Number.parseFloat(raw("--paper-cell-major")) || 40
  for (const [size, cls] of [[cell, "ch-paper"], [major, "ch-paper-major"]]) {
    const id = `paper-${serial++}`
    const pattern = el("pattern", { id, width: size, height: size, patternUnits: "userSpaceOnUse", x: box.x0, y: box.y0 }, defs)
    el("path", { class: cls, d: `M${size} 0V${size}M0 ${size}H${size}` }, pattern)
    el("rect", { x: box.x0, y: box.y0, width: box.x1 - box.x0, height: box.y1 - box.y0, fill: `url(#${id})` }, svg)
  }
}

export function yAxis(svg, box, y, ticks, digits, unit) {
  for (const t of ticks) {
    el("line", { class: "ch-grid", x1: box.x0, x2: box.x1, y1: y(t), y2: y(t) }, svg)
    el("text", { class: "ch-text", x: box.x0 - 8, y: y(t) + 4, "text-anchor": "end" }, svg, num(t, digits))
  }
  el("text", { class: "ch-text", x: box.x0 - 8, y: box.y0 - 14, "text-anchor": "end" }, svg, unit)
}

export function xAxis(svg, box, x, ticks, format) {
  el("line", { class: "ch-axis", x1: box.x0, x2: box.x1, y1: box.y1, y2: box.y1 }, svg)
  for (const t of ticks) {
    el("line", { class: "ch-axis", x1: x(t), x2: x(t), y1: box.y1, y2: box.y1 + 4 }, svg)
    el("text", { class: "ch-text", x: x(t), y: box.y1 + 18, "text-anchor": "middle" }, svg, format(t))
  }
}

export function label(svg, xPos, yPos, text, cls = "ch-label") {
  return el("text", { class: cls, x: xPos, y: yPos }, svg, text)
}

export function leader(svg, from, to, lines) {
  const shelf = Math.max(...lines.map((l) => l.length)) * 7 + 8
  const dir = to[0] >= from[0] ? 1 : -1
  el("path", { class: "ch-leader", d: `M${from[0]} ${from[1]}L${to[0]} ${to[1]}h${shelf * dir}` }, svg)
  lines.forEach((line, i) => {
    const anchor = dir > 0 ? "start" : "end"
    el("text", { class: i ? "ch-text" : "ch-label", x: to[0] + 4 * dir, y: to[1] - 6 - (lines.length - 1 - i) * 16, "text-anchor": anchor }, svg, line)
  })
}

export function render(selector, draw) {
  for (const host of document.querySelectorAll(selector)) {
    const run = () => draw(host)
    run()
    new ResizeObserver(() => {
      if (host.dataset.width === String(host.clientWidth)) return
      host.dataset.width = String(host.clientWidth)
      run()
    }).observe(host)
  }
}
