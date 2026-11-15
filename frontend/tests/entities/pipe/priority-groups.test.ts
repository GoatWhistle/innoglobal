import { describe, expect, it } from "vitest"
import { priorityGroups, type SegmentRow } from "@/entities/pipe"

function segment(id: number, rank: number | null): SegmentRow {
  return {
    segment_id: id,
    start_m: id * 10,
    end_m: (id + 1) * 10,
    forecast_mm: rank ?? 8,
    priority_rank: rank,
    observations: [],
    elevation_m: null,
    slope_pct: null,
    is_low_point: null,
    p05_mm: 1,
    p10_mm: 2,
    p90_mm: 4,
    p95_mm: 5,
  }
}

describe("priorityGroups", () => {
  it("joins physical neighbours while retaining every ranked segment", () => {
    const rows = [segment(4, 1), segment(2, 3), segment(1, 2), segment(3, null)]
    const groups = priorityGroups(rows)
    expect(groups.map((group) => [group.start, group.end, group.lead.segment_id])).toEqual([
      [10, 30, 1],
      [40, 50, 4],
    ])
    expect(groups.flatMap((group) => group.rows.map((row) => row.segment_id))).toEqual([1, 2, 4])
    expect(rows.map((row) => row.segment_id)).toEqual([4, 2, 1, 3])
  })

  it("opens the best ranked member even when it is inside a group", () => {
    const groups = priorityGroups([segment(8, 4), segment(9, 1), segment(10, 2)])
    expect(groups[0]?.lead.segment_id).toBe(9)
    expect(groups[0]?.rows).toHaveLength(3)
  })

  it("does not bridge a coordinate gap or include an unranked segment", () => {
    const shifted = { ...segment(2, 2), start_m: 21 }
    expect(priorityGroups([segment(1, 1), shifted])).toHaveLength(2)
    expect(priorityGroups([segment(1, null)])).toEqual([])
    expect(priorityGroups([])).toEqual([])
  })
})
