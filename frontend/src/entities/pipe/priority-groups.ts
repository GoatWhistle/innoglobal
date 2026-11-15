import type { SegmentRow } from "./pipe.types"

export interface PriorityGroup {
  readonly start: number
  readonly end: number
  readonly rows: readonly SegmentRow[]
  readonly lead: SegmentRow
}

export function priorityGroups(rows: readonly SegmentRow[]): PriorityGroup[] {
  const ordered = rows
    .filter((row) => row.priority_rank !== null)
    .toSorted((a, b) => a.start_m - b.start_m)
  const groups: PriorityGroup[] = []
  for (const row of ordered) {
    const previous = groups.at(-1)
    if (previous && previous.end === row.start_m) {
      groups[groups.length - 1] = {
        ...previous,
        end: row.end_m,
        rows: [...previous.rows, row],
        lead:
          (row.priority_rank ?? Infinity) < (previous.lead.priority_rank ?? Infinity)
            ? row
            : previous.lead,
      }
    } else {
      groups.push({ start: row.start_m, end: row.end_m, rows: [row], lead: row })
    }
  }
  return groups
}
