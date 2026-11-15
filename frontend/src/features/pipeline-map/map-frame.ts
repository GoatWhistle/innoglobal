import type { Box, Point, View } from "./map-geometry"

export interface Frame {
  readonly ctx: CanvasRenderingContext2D
  readonly box: Box
  readonly css: CSSStyleDeclaration
  readonly scale: number
  readonly ratio: number
  readonly view: View
  readonly px: (x: number) => number
  readonly py: (y: number) => number
}

export const token = (frame: Frame, name: string) => frame.css.getPropertyValue(name).trim()

export const font = (frame: Frame, size: number, weight = 400) =>
  `${weight} ${size}px ${token(frame, "--font-sans")}`

export function trace(frame: Frame, points: readonly Point[]) {
  points.forEach(([x, y], i) => {
    if (i) frame.ctx.lineTo(frame.px(x), frame.py(y))
    else frame.ctx.moveTo(frame.px(x), frame.py(y))
  })
}

export function haloText(frame: Frame, text: string, x: number, y: number, halo: string) {
  const { ctx } = frame
  ctx.lineJoin = "round"
  ctx.lineWidth = 4
  ctx.strokeStyle = halo
  ctx.strokeText(text, x, y)
  ctx.fillText(text, x, y)
}

export function inWorld(frame: Frame, paint: () => void) {
  const { ctx, ratio, scale, view, box } = frame
  const k = ratio * scale
  ctx.save()
  ctx.setTransform(
    k,
    0,
    0,
    k,
    ratio * (box.width / 2 - (view.x + view.width / 2) * scale),
    ratio * (box.height / 2 - (view.y + view.height / 2) * scale),
  )
  paint()
  ctx.restore()
}

export function pathOf(shapes: readonly (readonly Point[])[], close: boolean): Path2D {
  const path = new Path2D()
  for (const shape of shapes) {
    shape.forEach(([x, y], i) => {
      if (i) path.lineTo(x, y)
      else path.moveTo(x, y)
    })
    if (close) path.closePath()
  }
  return path
}
