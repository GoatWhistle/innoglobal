import type { SegmentRow } from "@/entities/pipe"
import type { TrackKind } from "./variant-types"

export function observed(row: SegmentRow, date: string | undefined, nominal: number) {
  if (!date) return nominal
  return row.observations.find((item) => item.run_date === date)?.residual_mm ?? null
}
export function trackValue(
  row: SegmentRow,
  kind: TrackKind,
  date: string | undefined,
  nominal: number,
) {
  if (kind === "elevation") return row.elevation_m
  if (kind === "priority") return row.priority_rank
  if (kind === "observed") return observed(row, date, nominal)
  if (kind === "delta") {
    const baseline = observed(row, date, nominal)
    return baseline === null ? null : row.forecast_mm - baseline
  }
  return row.forecast_mm
}
export function trackDomain(
  rows: readonly SegmentRow[],
  kind: TrackKind,
  nominal: number,
  date?: string,
) {
  if (kind === "priority") return [0, 1] as const
  if (kind === "forecast" || kind === "observed") return [0, nominal * 1.05] as const
  const values = rows
    .map((row) => trackValue(row, kind, date, nominal))
    .filter((v): v is number => v !== null)
  if (!values.length) return [0, 1] as const
  if (kind === "delta") {
    const span = Math.max(0.1, ...values.map(Math.abs))
    return [-span, span] as const
  }
  const low = Math.min(...values),
    high = Math.max(...values)
  return [low - 0.5, high + 0.5] as const
}
export function localRange(rows: readonly SegmentRow[], selected: number, radius = 5) {
  const index = Math.max(
    0,
    rows.findIndex((row) => row.segment_id === selected),
  )
  return {
    from: rows[Math.max(0, index - radius)]?.start_m ?? 0,
    to: rows[Math.min(rows.length - 1, index + radius)]?.end_m ?? 1,
  }
}
