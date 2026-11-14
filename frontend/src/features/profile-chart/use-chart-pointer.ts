import { type PointerEvent, useRef, useState } from "react"
import { type DistanceRange, indexAt, type SegmentRow } from "@/entities/pipe"
import type { Scale } from "./chart-scale"

const DRAG_THRESHOLD_PX = 6

export interface ChartPointerOptions {
  readonly rows: readonly SegmentRow[]
  readonly x: Scale
  readonly onSelect: (segmentId: number) => void
  readonly onRange: (range: DistanceRange) => void
}

function localX(event: PointerEvent<Element>): number {
  const rect = event.currentTarget.getBoundingClientRect()
  return event.clientX - rect.left
}

export function useChartPointer({ rows, x, onSelect, onRange }: ChartPointerOptions) {
  const [hover, setHover] = useState<number | null>(null)
  const [drag, setDrag] = useState<readonly [number, number] | null>(null)
  const origin = useRef<number | null>(null)
  const offset = x.range[0]

  const segmentAt = (pixel: number) => rows[indexAt(rows, x.invert(pixel + offset))]?.segment_id

  const handlers = {
    onPointerDown(event: PointerEvent<SVGRectElement>) {
      origin.current = localX(event)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    onPointerMove(event: PointerEvent<SVGRectElement>) {
      const pixel = localX(event)
      setHover(segmentAt(pixel) ?? null)
      const start = origin.current
      if (start !== null && Math.abs(pixel - start) > DRAG_THRESHOLD_PX) setDrag([start, pixel])
    },
    onPointerUp(event: PointerEvent<SVGRectElement>) {
      const start = origin.current
      const pixel = localX(event)
      origin.current = null
      setDrag(null)
      if (start === null) return
      if (Math.abs(pixel - start) > DRAG_THRESHOLD_PX) {
        const a = x.invert(start + offset)
        const b = x.invert(pixel + offset)
        onRange({ from: Math.min(a, b), to: Math.max(a, b) })
        return
      }
      const segment = segmentAt(pixel)
      if (segment !== undefined) onSelect(segment)
    },
    onPointerLeave() {
      setHover(null)
    },
    onPointerCancel() {
      origin.current = null
      setDrag(null)
    },
  }
  const dragBox = drag === null ? null : ([drag[0] + offset, drag[1] + offset] as const)
  return { hover, dragBox, handlers }
}
