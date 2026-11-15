import {
  type Box,
  centerOf,
  kmPerUnit,
  LON_SCALE,
  niceStep,
  outlines,
  type Point,
  scaleOf,
  type View,
} from "./map-geometry"

export interface MapLine {
  readonly pipe_id: number
  readonly direction: string
  readonly projected: readonly Point[]
  readonly product: boolean
}

export interface MapLabels {
  readonly lon: (value: number) => string
  readonly lat: (value: number) => string
  readonly distance: (km: number) => string
}

export interface MapPaint {
  readonly view: View
  readonly lines: readonly MapLine[]
  readonly selected: number | undefined
  readonly hovered: number | undefined
  readonly labels: MapLabels
}

interface Frame {
  readonly ctx: CanvasRenderingContext2D
  readonly box: Box
  readonly css: CSSStyleDeclaration
  readonly px: (x: number) => number
  readonly py: (y: number) => number
}

const token = (frame: Frame, name: string) => frame.css.getPropertyValue(name).trim()

function trace(frame: Frame, points: readonly Point[]) {
  points.forEach(([x, y], i) => {
    if (i) frame.ctx.lineTo(frame.px(x), frame.py(y))
    else frame.ctx.moveTo(frame.px(x), frame.py(y))
  })
}

function paintLand(frame: Frame) {
  const { ctx } = frame
  ctx.fillStyle = token(frame, "--surface-sunken")
  ctx.strokeStyle = token(frame, "--border-subtle")
  ctx.lineWidth = 1
  for (const polygon of outlines) {
    ctx.beginPath()
    for (const ring of polygon) trace(frame, ring)
    ctx.fill("evenodd")
    ctx.stroke()
  }
}

function gridValues(start: number, end: number, step: number): number[] {
  const values: number[] = []
  for (let value = Math.ceil(start / step) * step; value <= end; value += step) values.push(value)
  return values
}

function paintGrid(frame: Frame, view: View, labels: MapLabels) {
  const { ctx, box } = frame
  const scale = scaleOf(view, box)
  const [cx, cy] = centerOf(view)
  const halfX = box.width / scale / 2
  const halfY = box.height / scale / 2
  const lonStep = niceStep((box.width / scale / LON_SCALE) * (240 / box.width))
  const latStep = niceStep((box.height / scale) * (160 / box.height))
  const digits = (step: number) => Math.max(0, -Math.floor(Math.log10(step) + 1e-9))
  ctx.save()
  ctx.strokeStyle = token(frame, "--border-subtle")
  ctx.fillStyle = token(frame, "--text-muted")
  ctx.setLineDash([2, 4])
  ctx.font = `11px ${token(frame, "--font-sans")}`
  ctx.textBaseline = "top"
  for (const lon of gridValues((cx - halfX) / LON_SCALE, (cx + halfX) / LON_SCALE, lonStep)) {
    const x = Math.round(frame.px(lon * LON_SCALE)) + 0.5
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, box.height)
    ctx.stroke()
    ctx.fillText(labels.lon(Number(lon.toFixed(digits(lonStep)))), x + 4, 6)
  }
  for (const lat of gridValues(-(cy + halfY), -(cy - halfY), latStep)) {
    const y = Math.round(frame.py(-lat)) + 0.5
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(box.width, y)
    ctx.stroke()
    ctx.fillText(labels.lat(Number(lat.toFixed(digits(latStep)))), 6, y + 4)
  }
  ctx.restore()
}

function rank(line: MapLine, paint: MapPaint): number {
  if (line.pipe_id === paint.selected) return 3
  if (line.pipe_id === paint.hovered) return 2
  return line.product ? 1 : 0
}

const STYLES: readonly (readonly [string, number])[] = [
  ["--border-strong", 1.5],
  ["--text-secondary", 2.5],
  ["--text-primary", 3],
  ["--text-primary", 4],
]

function paintLines(frame: Frame, paint: MapPaint) {
  const { ctx } = frame
  const order = [...paint.lines].sort((a, b) => rank(a, paint) - rank(b, paint))
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  for (const line of order) {
    const [color, width] = STYLES[rank(line, paint)] ?? ["--border-strong", 1.5]
    ctx.strokeStyle = token(frame, color)
    ctx.lineWidth = width
    ctx.beginPath()
    trace(frame, line.projected)
    ctx.stroke()
  }
}

function paintEnd(frame: Frame, point: Point, name: string | undefined, side: number) {
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
  if (!name) return
  ctx.textAlign = side < 0 ? "right" : "left"
  ctx.lineWidth = 4
  ctx.strokeStyle = token(frame, "--surface-base")
  ctx.strokeText(name, x + side * 12, y)
  ctx.fillStyle = token(frame, "--text-primary")
  ctx.fillText(name, x + side * 12, y)
}

function paintEnds(frame: Frame, paint: MapPaint) {
  const line = paint.lines.find((item) => item.pipe_id === paint.selected)
  const first = line?.projected[0]
  const last = line?.projected.at(-1)
  if (!line || !first || !last) return
  const names = line.direction.split(" - ")
  frame.ctx.font = `500 12px ${token(frame, "--font-sans")}`
  frame.ctx.textBaseline = "middle"
  frame.ctx.lineJoin = "round"
  const leftFirst = first[0] <= last[0]
  paintEnd(frame, first, names[0], leftFirst ? -1 : 1)
  paintEnd(frame, last, names[1], leftFirst ? 1 : -1)
}

function paintScale(frame: Frame, view: View, labels: MapLabels) {
  const { ctx, box } = frame
  const kmPerPx = kmPerUnit(view) / scaleOf(view, box)
  const km = niceStep(kmPerPx * 120)
  const length = km / kmPerPx
  const left = box.width < 640 ? 24 : box.width / 2 - length / 2
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
  ctx.font = `11px ${token(frame, "--font-sans")}`
  ctx.textAlign = "center"
  ctx.textBaseline = "bottom"
  ctx.fillText(labels.distance(km), left + length / 2, bottom - 6)
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
  const frame: Frame = {
    ctx,
    box,
    css: getComputedStyle(element),
    px: (x) => (x - view.x - view.width / 2) * scale + box.width / 2,
    py: (y) => (y - view.y - view.height / 2) * scale + box.height / 2,
  }
  paintLand(frame)
  paintGrid(frame, view, paint.labels)
  paintLines(frame, paint)
  paintEnds(frame, paint)
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
