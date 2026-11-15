import { paintBasemap, paintBasemapLabels, type Rect } from "./map-basemap"
import { type Frame, font, haloText, token, trace } from "./map-frame"
import { kmPerUnit, niceStep, type Point, scaleOf, type View } from "./map-geometry"

export interface MapLine {
  readonly pipe_id: number
  readonly direction: string
  readonly projected: readonly Point[]
  readonly product: boolean
}

export interface MapLabels {
  readonly distance: (km: number) => string
}

export interface MapPaint {
  readonly view: View
  readonly lines: readonly MapLine[]
  readonly selected: number | undefined
  readonly hovered: number | undefined
  readonly labels: MapLabels
}

const STYLES: readonly (readonly [string, number])[] = [
  ["--text-secondary", 1.5],
  ["--text-primary", 2.5],
  ["--text-primary", 3.5],
  ["--text-primary", 4.5],
]

function rank(line: MapLine, paint: MapPaint): number {
  if (line.pipe_id === paint.selected) return 3
  if (line.pipe_id === paint.hovered) return 2
  return line.product ? 1 : 0
}

function paintLines(frame: Frame, paint: MapPaint) {
  const { ctx } = frame
  const order = [...paint.lines].sort((a, b) => rank(a, paint) - rank(b, paint))
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  for (const line of order) {
    const level = rank(line, paint)
    const [color, width] = STYLES[level] ?? ["--text-secondary", 1.5]
    if (level === 3) {
      ctx.strokeStyle = token(frame, "--surface-sunken")
      ctx.lineWidth = width + 4
      ctx.beginPath()
      trace(frame, line.projected)
      ctx.stroke()
    }
    ctx.strokeStyle = token(frame, color)
    ctx.lineWidth = width
    ctx.beginPath()
    trace(frame, line.projected)
    ctx.stroke()
  }
}

function paintEnd(frame: Frame, point: Point, name: string | undefined, side: number): Rect {
  const { ctx } = frame
  const x = frame.px(point[0])
  const y = frame.py(point[1])
  ctx.beginPath()
  ctx.arc(x, y, 5, 0, Math.PI * 2)
  ctx.fillStyle = token(frame, "--surface-base")
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = token(frame, "--text-primary")
  ctx.stroke()
  const label = name ?? ""
  const width = ctx.measureText(label).width
  ctx.textAlign = side < 0 ? "right" : "left"
  ctx.fillStyle = token(frame, "--text-primary")
  haloText(frame, label, x + side * 12, y, token(frame, "--surface-sunken"))
  const left = side < 0 ? x - 12 - width : x - 8
  const right = side < 0 ? x + 8 : x + 12 + width
  return { left: left - 4, right: right + 4, top: y - 12, bottom: y + 12 }
}

function paintEnds(frame: Frame, paint: MapPaint): Rect[] {
  const line = paint.lines.find((item) => item.pipe_id === paint.selected)
  const first = line?.projected[0]
  const last = line?.projected.at(-1)
  if (!line || !first || !last) return []
  const names = line.direction.split(" - ")
  frame.ctx.font = font(frame, 12, 600)
  frame.ctx.textBaseline = "middle"
  const leftFirst = first[0] <= last[0]
  return [
    paintEnd(frame, first, names[0], leftFirst ? -1 : 1),
    paintEnd(frame, last, names[1], leftFirst ? 1 : -1),
  ]
}

function paintScale(frame: Frame, view: View, labels: MapLabels) {
  const { ctx, box } = frame
  const kmPerPx = kmPerUnit(view) / frame.scale
  const km = niceStep(kmPerPx * 120)
  const length = km / kmPerPx
  const left = 24
  const bottom = box.height - 24
  ctx.save()
  ctx.strokeStyle = token(frame, "--text-primary")
  ctx.fillStyle = token(frame, "--text-primary")
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(left, bottom - 5)
  ctx.lineTo(left, bottom)
  ctx.lineTo(left + length, bottom)
  ctx.lineTo(left + length, bottom - 5)
  ctx.stroke()
  ctx.font = font(frame, 11)
  ctx.textAlign = "left"
  ctx.textBaseline = "bottom"
  haloText(frame, labels.distance(km), left, bottom - 6, token(frame, "--surface-sunken"))
  ctx.restore()
}

export function drawMap(element: HTMLCanvasElement, paint: MapPaint) {
  const rect = element.getBoundingClientRect()
  const ratio = window.devicePixelRatio
  element.width = rect.width * ratio
  element.height = rect.height * ratio
  const ctx = element.getContext("2d")
  if (!ctx) return
  ctx.scale(ratio, ratio)
  const { view } = paint
  const box = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  const scale = scaleOf(view, box)
  const css = getComputedStyle(element)
  ctx.fillStyle = css.getPropertyValue("--surface-base").trim()
  ctx.fillRect(0, 0, box.width, box.height)
  const frame: Frame = {
    ctx,
    box,
    css,
    scale,
    ratio,
    view,
    px: (x) => (x - view.x - view.width / 2) * scale + box.width / 2,
    py: (y) => (y - view.y - view.height / 2) * scale + box.height / 2,
  }
  paintBasemap(frame, view)
  paintLines(frame, paint)
  const taken = paintEnds(frame, paint)
  paintBasemapLabels(frame, view, taken)
  paintScale(frame, view, paint.labels)
}

function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const length = dx * dx + dy * dy
  const raw = length ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length : 0
  const t = Math.max(0, Math.min(1, raw))
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}

export function nearestLine(lines: readonly MapLine[], point: Point, tolerance: number) {
  let best = tolerance
  let id: number | undefined
  for (const line of lines)
    for (let i = 1; i < line.projected.length; i++) {
      const a = line.projected[i - 1]
      const b = line.projected[i]
      if (!a || !b) continue
      const distance = segmentDistance(point, a, b)
      if (distance < best) {
        best = distance
        id = line.pipe_id
      }
    }
  return id
}
