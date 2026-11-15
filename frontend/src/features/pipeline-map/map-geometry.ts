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

const EARTH_KM = 40075.017
const MIN_SPAN = 0.00001
const MAX_SPAN = 1.5

export const wrapLon = (lon: number) => (lon < 0 ? lon + 360 : lon)

export const project = (lon: number, lat: number): Point => {
  const phi = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180
  return [(wrapLon(lon) + 180) / 360, (1 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / Math.PI) / 2]
}

export const latitudeAt = (y: number) =>
  (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI

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

export const countryView: View = fitBounds([project(19, 41), project(191, 82)], 1.04)

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
  const lat = latitudeAt(centerOf(view)[1])
  return EARTH_KM * Math.cos((lat * Math.PI) / 180)
}

export function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(raw))
  const unit = raw / power
  const nice = unit < 1.5 ? 1 : unit < 3.5 ? 2 : unit < 7.5 ? 5 : 10
  return nice * power
}
