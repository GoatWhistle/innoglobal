import type { SegmentRow } from "@/entities/pipe"
import type { ChartScale } from "./chart-scale"

type Pick = (row: SegmentRow) => number | null
const fixed = (v: number) => v.toFixed(1)
export function linePath(rows: readonly SegmentRow[], scale: ChartScale, pick: Pick) {
  let path = "",
    open = false
  for (const row of rows) {
    const value = pick(row)
    if (value === null) {
      open = false
      continue
    }
    const x = fixed(scale.x((row.start_m + row.end_m) / 2)),
      y = fixed(scale.y(value))
    path += `${open ? "L" : "M"}${x} ${y}`
    open = true
  }
  return path
}
export function bandPath(rows: readonly SegmentRow[], scale: ChartScale, upper: Pick, lower: Pick) {
  const top = rows.map((r) => [scale.x(r.start_m), scale.x(r.end_m), upper(r)] as const)
  const bottom = rows.map((r) => [scale.x(r.start_m), scale.x(r.end_m), lower(r)] as const)
  if (!top.length) return ""
  const forward = top.map(([a, b, v]) => `${fixed(a)} ${fixed(scale.y(v ?? 0))}H${fixed(b)}`)
  const back = [...bottom]
    .reverse()
    .map(([a, b, v]) => `${fixed(b)} ${fixed(scale.y(v ?? 0))}H${fixed(a)}`)
  return `M${forward.join("L")}L${back.join("L")}Z`
}
export function binnedArea(
  rows: readonly SegmentRow[],
  scale: ChartScale,
  pick: Pick,
  sign: 1 | -1,
  bin = 4,
) {
  const zero = fixed(scale.y(0))
  const peaks = new Map<number, number>()
  for (const row of rows) {
    const value = pick(row)
    if (value === null || value * sign <= 0) continue
    const first = Math.floor(Math.max(0, scale.x(row.start_m)) / bin),
      last = Math.floor(Math.max(0, scale.x(row.end_m) - 0.01) / bin)
    for (let i = first; i <= last; i += 1) peaks.set(i, Math.max(peaks.get(i) ?? 0, value * sign))
  }
  let path = ""
  for (const [i, peak] of peaks) {
    const a = i * bin
    if (a > scale.width) continue
    path += `M${fixed(a)} ${zero}V${fixed(scale.y(peak * sign))}h${bin - 1}V${zero}Z`
  }
  return path
}
