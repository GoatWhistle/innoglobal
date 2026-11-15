import country from "./russia.json"

export type Point = readonly [number, number]
export interface View {
  x: number
  y: number
  width: number
  height: number
}
export const project = (lon: number, lat: number): Point => [
  (lon < 0 ? lon + 360 : lon) * 0.55,
  -lat,
]
export const outlines = country.map((polygon) =>
  polygon.map((ring) => ring.map((p) => project(p[0] ?? 0, p[1] ?? 0))),
)
export const countryView: View = { x: 9, y: -84, width: 100, height: 50 }
export function fitBounds(points: readonly Point[]): View {
  if (!points.length) return countryView
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1])
  const width = Math.max(0.01, Math.max(...xs) - Math.min(...xs)) * 1.6
  const height = Math.max(0.01, Math.max(...ys) - Math.min(...ys)) * 1.6
  return {
    x: (Math.max(...xs) + Math.min(...xs) - width) / 2,
    y: (Math.max(...ys) + Math.min(...ys) - height) / 2,
    width,
    height,
  }
}
export function zoom(view: View, factor: number): View {
  return {
    x: view.x + (view.width * (1 - factor)) / 2,
    y: view.y + (view.height * (1 - factor)) / 2,
    width: view.width * factor,
    height: view.height * factor,
  }
}
