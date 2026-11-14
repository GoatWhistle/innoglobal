import type { SegmentRow } from "./pipe.types"

export interface DistanceRange {
  readonly from: number
  readonly to: number
}

export const MIN_RANGE_M = 20

export function fullRange(rows: readonly SegmentRow[]): DistanceRange {
  return { from: rows[0]?.start_m ?? 0, to: rows.at(-1)?.end_m ?? 1 }
}

export function indexAt(rows: readonly SegmentRow[], distance: number): number {
  let low = 0
  let high = rows.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if ((rows[middle]?.start_m ?? 0) <= distance) low = middle
    else high = middle - 1
  }
  return Math.max(0, low)
}

export function clampRange(range: DistanceRange, full: DistanceRange): DistanceRange {
  const from = Math.max(full.from, Math.min(range.from, range.to))
  const to = Math.min(full.to, Math.max(range.from, range.to))
  return to - from < MIN_RANGE_M ? full : { from, to }
}

export function isFull(range: DistanceRange, full: DistanceRange): boolean {
  return range.from <= full.from && range.to >= full.to
}
