import type { SegmentRow } from "@/entities/pipe"

export type SortKey = "rank" | "distance" | "thickness"
export type SortOrder = "asc" | "desc"

const VALUE: Readonly<Record<SortKey, (row: SegmentRow) => number>> = {
  rank: (row) => row.priority_rank ?? Number.POSITIVE_INFINITY,
  distance: (row) => row.start_m,
  thickness: (row) => row.forecast_mm,
}

export function sortRows(rows: readonly SegmentRow[], key: SortKey, order: SortOrder) {
  const pick = VALUE[key]
  const sign = order === "asc" ? 1 : -1
  return [...rows].sort((a, b) => sign * (pick(a) - pick(b)) || a.segment_id - b.segment_id)
}

export const KM = 1000

export function kilometerBuckets(lengthM: number): number[] {
  return Array.from({ length: Math.ceil(lengthM / KM) }, (_, index) => index)
}

export function inBucket(row: SegmentRow, bucket: number | null): boolean {
  if (bucket === null) return true
  return row.end_m > bucket * KM && row.start_m < (bucket + 1) * KM
}
