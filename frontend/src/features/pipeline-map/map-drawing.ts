import { outlines, type Point, type View } from "./map-geometry"
export interface MapLine {
  pipe_id: number
  projected: readonly Point[]
}
function path(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  px: (x: number) => number,
  py: (y: number) => number,
) {
  points.forEach(([x, y], i) => {
    if (i) ctx.lineTo(px(x), py(y))
    else ctx.moveTo(px(x), py(y))
  })
}
export function drawMap(
  element: HTMLCanvasElement,
  view: View,
  lines: readonly MapLine[],
  selected: number | undefined,
) {
  const box = element.getBoundingClientRect(),
    ratio = window.devicePixelRatio
  element.width = box.width * ratio
  element.height = box.height * ratio
  const ctx = element.getContext("2d")
  if (!ctx) return
  ctx.scale(ratio, ratio)
  const tokens = getComputedStyle(element),
    scale = Math.min(box.width / view.width, box.height / view.height)
  const px = (x: number) => (x - view.x - view.width / 2) * scale + box.width / 2
  const py = (y: number) => (y - view.y - view.height / 2) * scale + box.height / 2
  ctx.fillStyle = tokens.getPropertyValue("--surface-sunken")
  ctx.strokeStyle = tokens.getPropertyValue("--border-subtle")
  for (const polygon of outlines) {
    ctx.beginPath()
    for (const ring of polygon) path(ctx, ring, px, py)
    ctx.fill("evenodd")
    ctx.stroke()
  }
  for (const line of lines) {
    ctx.strokeStyle = tokens.getPropertyValue(
      line.pipe_id === selected ? "--text-primary" : "--text-muted",
    )
    ctx.lineWidth = line.pipe_id === selected ? 4 : 2
    ctx.beginPath()
    path(ctx, line.projected, px, py)
    ctx.stroke()
    const start = line.projected[0]
    if (start) {
      ctx.fillStyle = ctx.strokeStyle
      ctx.beginPath()
      ctx.arc(px(start[0]), py(start[1]), 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
export function nearestLine(lines: readonly MapLine[], x: number, y: number, tolerance: number) {
  let best = tolerance,
    id: number | undefined
  for (const line of lines)
    for (const p of line.projected) {
      const distance = Math.hypot(p[0] - x, p[1] - y)
      if (distance < best) {
        best = distance
        id = line.pipe_id
      }
    }
  return id
}
