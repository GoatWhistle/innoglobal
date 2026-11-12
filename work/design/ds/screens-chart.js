import { fmt, SEGMENT_M, SENSORS } from "./screens-data.js"

let seq = 0

export const scale = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0)

export const path = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("")

export const textWidth = (s, size = 12) => s.length * size * 0.56

export function hatch(tone) {
  const id = `hatch-${tone}-${++seq}`
  return {
    id,
    def: `<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path class="ch-hatch" data-tone="${tone}" d="M0 0V6"/></pattern>`,
  }
}

export function dimension(x1, x2, y, label, cls = "") {
  const t = 5
  const mid = (x1 + x2) / 2
  return `<g class="ch-dim ${cls}"><path d="M${x1} ${y}H${x2}M${x1 - t} ${y + t}L${x1 + t} ${y - t}M${x2 - t} ${y + t}L${x2 + t} ${y - t}"/><text x="${mid}" y="${y - 6}" text-anchor="middle">${label}</text></g>`
}

export function extension(x, y1, y2) {
  return `<path class="ch-ext" d="M${x} ${y1}V${y2}"/>`
}

export function leader(px, py, label, opts = {}) {
  const dir = opts.dir ?? 1
  const dx = (opts.dx ?? 18) * dir
  const dy = opts.dy ?? 22
  const w = textWidth(label) + 8
  const ex = px + dx
  const ey = py - dy
  const sx = ex + w * dir
  const tx = dir > 0 ? ex + 4 : sx + 4
  return `<g class="ch-leader" data-tone="${opts.tone ?? ""}"><circle cx="${px}" cy="${py}" r="2.5"/><path d="M${px} ${py}L${ex} ${ey}H${sx}"/><text x="${tx}" y="${ey - 5}">${label}</text></g>`
}

export function mount(host, draw) {
  const run = () => {
    const w = host.clientWidth
    const h = host.clientHeight
    if (!w || !h) return
    host.innerHTML = draw(w, h)
  }
  new ResizeObserver(run).observe(host)
  run()
  return run
}

export function profileChart(data, opts = {}) {
  return (w, h) => {
    const pad = { l: 52, r: 16, t: opts.dims === false ? 16 : 40, b: 40 }
    const [lo, hi] = opts.range ?? [3.8, 5.1]
    const x = scale(0, SEGMENT_M, pad.l, w - pad.r)
    const y = scale(lo, hi, h - pad.b, pad.t)
    const tone = opts.tone ?? "warning"
    const hh = hatch(tone)
    const model = data.map((p) => [x(p.x), y(p.model)])
    const measured = data.map((p) => [x(p.x), y(p.measured)])
    const gap = `${path(model)}${path([...measured].reverse()).replace("M", "L")}Z`
    const ticks = []
    for (let v = Math.ceil(lo * 2) / 2; v <= hi; v += 0.5)
      ticks.push(
        `<path class="ch-grid" d="M${pad.l} ${y(v)}H${w - pad.r}"/><text class="ch-y" x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end">${fmt(v, 1)}</text>`,
      )
    const sensors = SENSORS.map((s, i) => {
      const sx = x(s.x)
      const st = opts.states?.[i] ?? "calm"
      return `<g class="ch-sensor" data-state="${st}"><path d="M${sx} ${h - pad.b}v5"/><circle cx="${sx}" cy="${y(data[Math.round((s.x / SEGMENT_M) * (data.length - 1))].measured)}" r="3"/><text x="${sx}" y="${h - pad.b + 18}" text-anchor="${i === 0 ? "start" : i === SENSORS.length - 1 ? "end" : "middle"}">${s.id}</text>${w < 520 ? "" : `<text class="ch-sub" x="${sx}" y="${h - pad.b + 32}" text-anchor="${i === 0 ? "start" : i === SENSORS.length - 1 ? "end" : "middle"}">${fmt(s.x / 1000, 1)} км</text>`}</g>`
    }).join("")
    const dims =
      opts.dims === false
        ? ""
        : dimension(x(0), x(SEGMENT_M), 14, `${fmt(SEGMENT_M, 0)} м`, "ch-dim-total") +
          extension(x(0), 14, y(data[0].model)) +
          extension(x(SEGMENT_M), 14, y(data.at(-1).model))
    const leak = opts.leak ? leakMark(opts.leak, x, y, pad, h, w) : ""
    const note = opts.note ? leader(...opts.note(x, y), { tone, dir: opts.noteDir ?? -1, dy: 46, dx: 30 }) : ""
    return `<svg class="ch" width="${w}" height="${h}" role="img" aria-label="${opts.label ?? "Профиль давления вдоль участка"}"><defs>${hh.def}</defs>
${ticks.join("")}<text class="ch-y ch-unit" x="${pad.l - 8}" y="${pad.t - 10}" text-anchor="end">МПа</text>
${opts.gap === false ? "" : `<path class="ch-gap" data-tone="${tone}" d="${gap}"/><path d="${gap}" fill="url(#${hh.id})"/>`}
<path class="ch-axis" d="M${pad.l} ${h - pad.b}H${w - pad.r}"/>
<path class="ch-model" d="${path(model)}"/>
${opts.draft ? `<path class="ch-draft" d="${path(opts.draft.map((p) => [x(p.x), y(p.model)]))}"/>` : ""}
<path class="ch-measured" d="${path(measured)}"/>
${sensors}${dims}${leak}${note}</svg>`
  }
}

function leakMark(leak, x, y, pad, h, w) {
  const cx = x(leak.x)
  const half = Math.max(2, x(leak.x + leak.spread) - cx)
  const label = `Утечка ${fmt(leak.x, 0)} м`
  const flip = cx + textWidth(label) + 40 > w
  return `<g class="ch-leak"><path class="ch-center" d="M${cx} ${pad.t - 4}V${h - pad.b + 4}"/><rect class="ch-zone" x="${cx - half}" y="${pad.t}" width="${half * 2}" height="${h - pad.b - pad.t}"/>${dimension(cx - half, cx + half, h - pad.b - 12, "", "ch-dim-leak")}</g>${leader(cx, pad.t + 18, label, { tone: "danger", dir: flip ? -1 : 1, dy: 10, dx: 12 })}`
}

export function legend(items) {
  return `<ul class="ch-legend">${items.map(([cls, label]) => `<li><svg viewBox="0 0 24 8" aria-hidden="true"><path class="${cls}" d="M0 4H24"/></svg>${label}</li>`).join("")}</ul>`
}
