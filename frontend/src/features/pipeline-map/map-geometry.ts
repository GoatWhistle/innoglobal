import country from "./russia.json"

export type Point = readonly [number, number]
export interface View {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}
export interface Box {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

export const LON_SCALE = 0.55
const KM_PER_DEGREE = 111.32
const MIN_SPAN = 0.002
const MAX_SPAN = 140

export const project = (lon: number, lat: number): Point => [
  (lon < 0 ? lon + 360 : lon) * LON_SCALE,
  -lat,
]
export const outlines = country.map((polygon) =>
  polygon.map((ring) => ring.map((p) => project(p[0] ?? 0, p[1] ?? 0))),
)
export const countryView: View = { x: 9, y: -84, width: 100, height: 50 }

export function fitBounds(points: readonly Point[], padding = 1.25): View {
  if (!points.length) return countryView
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const width = Math.max(MIN_SPAN, Math.max(...xs) - Math.min(...xs)) * padding
  const height = Math.max(MIN_SPAN, Math.max(...ys) - Math.min(...ys)) * padding
  return {
    x: (Math.max(...xs) + Math.min(...xs) - width) / 2,
    y: (Math.max(...ys) + Math.min(...ys) - height) / 2,
    width,
    height,
  }
}

export function scaleOf(view: View, box: Box): number {
  return Math.min(box.width / view.width, box.height / view.height)
}

export function toWorld(view: View, box: Box, clientX: number, clientY: number): Point {
  const scale = scaleOf(view, box)
  return [
    (clientX - box.left - box.width / 2) / scale + view.x + view.width / 2,
    (clientY - box.top - box.height / 2) / scale + view.y + view.height / 2,
  ]
}

export function zoomAt(view: View, factor: number, focus: Point): View {
  const next = Math.min(MAX_SPAN, Math.max(MIN_SPAN, view.width * factor)) / view.width
  return {
    x: focus[0] - (focus[0] - view.x) * next,
    y: focus[1] - (focus[1] - view.y) * next,
    width: view.width * next,
    height: view.height * next,
  }
}

export function centerOf(view: View): Point {
  return [view.x + view.width / 2, view.y + view.height / 2]
}

export function mixView(from: View, to: View, t: number): View {
  const [fx, fy] = centerOf(from)
  const [tx, ty] = centerOf(to)
  const width = from.width * (to.width / from.width) ** t
  const height = from.height * (to.height / from.height) ** t
  const cx = fx + (tx - fx) * t
  const cy = fy + (ty - fy) * t
  return { x: cx - width / 2, y: cy - height / 2, width, height }
}

export function kmPerUnit(view: View): number {
  const lat = -centerOf(view)[1]
  return (KM_PER_DEGREE * Math.cos((lat * Math.PI) / 180)) / LON_SCALE
}

export function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(raw))
  const unit = raw / power
  const nice = unit < 1.5 ? 1 : unit < 3.5 ? 2 : unit < 7.5 ? 5 : 10
  return nice * power
}
