import type { SegmentRow } from "@/entities/pipe"
import type { RouteLine } from "@/entities/reference"

export type RoutePoint = readonly [number, number, number]

export interface Projection {
  readonly at: (lon: number, lat: number) => readonly [number, number]
  readonly metersPerPixel: number
}

const EARTH_METERS_PER_DEGREE = 111_320

export function project(
  focus: readonly RoutePoint[],
  width: number,
  height: number,
  padding: number,
): Projection {
  const lons = focus.map((point) => point[1])
  const lats = focus.map((point) => point[2])
  const [lon0, lon1] = [Math.min(...lons), Math.max(...lons)]
  const [lat0, lat1] = [Math.min(...lats), Math.max(...lats)]
  const shrink = Math.cos((((lat0 + lat1) / 2) * Math.PI) / 180)
  const spanX = Math.max(1e-6, (lon1 - lon0) * shrink)
  const spanY = Math.max(1e-6, lat1 - lat0)
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY)
  const offsetX = (width - spanX * scale) / 2
  const offsetY = (height - spanY * scale) / 2
  return {
    at: (lon, lat) => [offsetX + (lon - lon0) * shrink * scale, offsetY + (lat1 - lat) * scale],
    metersPerPixel: EARTH_METERS_PER_DEGREE / scale,
  }
}

export function pointAt(points: readonly RoutePoint[], distance: number): RoutePoint | undefined {
  if (points.length === 0) return undefined
  const index = points.findIndex((point) => point[0] >= distance)
  if (index <= 0) return points[index === 0 ? 0 : points.length - 1]
  const before = points[index - 1]
  const after = points[index]
  if (before === undefined || after === undefined) return before ?? after
  const share = (distance - before[0]) / (after[0] - before[0] || 1)
  return [
    distance,
    before[1] + (after[1] - before[1]) * share,
    before[2] + (after[2] - before[2]) * share,
  ]
}

export interface SegmentLine {
  readonly segmentId: number
  readonly from: readonly [number, number]
  readonly to: readonly [number, number]
  readonly forecast: number
}

export function segmentLines(
  rows: readonly SegmentRow[],
  route: RouteLine,
  projection: Projection,
): SegmentLine[] {
  const lines: SegmentLine[] = []
  for (const row of rows) {
    const a = pointAt(route.points, row.start_m)
    const b = pointAt(route.points, row.end_m)
    if (a === undefined || b === undefined) continue
    lines.push({
      segmentId: row.segment_id,
      from: projection.at(a[1], a[2]),
      to: projection.at(b[1], b[2]),
      forecast: row.forecast_mm,
    })
  }
  return lines
}

export function linePath(route: RouteLine, projection: Projection): string {
  return route.points
    .map((point, index) => {
      const [x, y] = projection.at(point[1], point[2])
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join("")
}

const SCALE_STEPS = [50, 100, 200, 250, 500, 1000, 2000, 5000, 10_000] as const

export function scaleBar(metersPerPixel: number, maxPixels: number): number {
  const fit = SCALE_STEPS.filter((meters) => meters / metersPerPixel <= maxPixels)
  return fit.at(-1) ?? SCALE_STEPS[0]
}
