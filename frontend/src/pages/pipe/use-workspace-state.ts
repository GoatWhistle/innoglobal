import { useCallback } from "react"
import { useSearchParams } from "react-router"
import { clampRange, type DistanceRange, fullRange, isFull, type SegmentRow } from "@/entities/pipe"

function readNumber(params: URLSearchParams, name: string): number | null {
  const raw = params.get(name)
  if (raw === null || raw.trim() === "") return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function follow(range: DistanceRange, row: SegmentRow, full: DistanceRange): DistanceRange {
  if (row.start_m >= range.from && row.end_m <= range.to) return range
  const width = range.to - range.from
  const center = (row.start_m + row.end_m) / 2
  const from = Math.max(full.from, Math.min(full.to - width, center - width / 2))
  return { from, to: from + width }
}

export function useWorkspaceState(rows: readonly SegmentRow[], fallback: number) {
  const [params, setParams] = useSearchParams()
  const full = fullRange(rows)
  const requested = readNumber(params, "segment")
  const valid = requested !== null && Number.isInteger(requested) && rows[requested] !== undefined
  const segment = valid ? requested : fallback
  const from = readNumber(params, "from")
  const to = readNumber(params, "to")
  const range = from !== null && to !== null ? clampRange({ from, to }, full) : full

  const write = useCallback(
    (nextSegment: number, nextRange: DistanceRange) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.set("segment", String(nextSegment))
          if (isFull(nextRange, full)) {
            next.delete("from")
            next.delete("to")
          } else {
            next.set("from", String(Math.round(nextRange.from)))
            next.set("to", String(Math.round(nextRange.to)))
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams, full],
  )

  const select = useCallback(
    (segmentId: number) => {
      const row = rows[segmentId]
      if (row !== undefined) write(segmentId, follow(range, row, full))
    },
    [rows, range, full, write],
  )
  const zoom = useCallback(
    (next: DistanceRange) => write(segment, clampRange(next, full)),
    [segment, full, write],
  )
  const reset = useCallback(() => write(segment, full), [segment, full, write])

  return {
    segment,
    range,
    full,
    isZoomed: !isFull(range, full),
    select,
    zoom,
    reset,
    invalid: requested !== null && !valid,
  }
}
