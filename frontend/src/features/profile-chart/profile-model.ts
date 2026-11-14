import type { DistanceRange, SegmentRow } from "@/entities/pipe"

export function visibleRows(rows: readonly SegmentRow[], range: DistanceRange): SegmentRow[] {
  return rows.filter((row) => row.end_m > range.from && row.start_m < range.to)
}

export function thicknessDomain(
  rows: readonly SegmentRow[],
  nominal: number,
  reject: number | null,
): readonly [number, number] {
  let low = nominal
  for (const row of rows) {
    low = Math.min(low, row.p10_mm)
    for (const item of row.observations) low = Math.min(low, item.residual_mm)
  }
  if (reject !== null) low = Math.min(low, reject)
  const pad = Math.max(0.2, (nominal - low) * 0.08)
  return [Math.max(0, low - pad), nominal + pad]
}
