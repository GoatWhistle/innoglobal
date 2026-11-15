import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react"
import { type DistanceRange, indexAt, type SegmentRow } from "@/entities/pipe"

interface InputProps {
  readonly rows: readonly SegmentRow[]
  readonly selected: number
  readonly range: DistanceRange
  readonly onSelect: (id: number) => void
  readonly onRange: (range: DistanceRange) => void
}
export function useTrackInput(props: InputProps) {
  const origin = useRef<number | null>(null)
  const scanning = useRef(false)
  const [hover, setHover] = useState<number | null>(null)
  const [drag, setDrag] = useState<readonly [number, number] | null>(null)
  const point = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    return Math.max(0, Math.min(1, (event.clientX - box.left) / box.width))
  }
  const meters = (x: number) => props.range.from + x * (props.range.to - props.range.from)
  const pick = (x: number) => {
    const row = props.rows[indexAt(props.rows, meters(x))]
    if (row) props.onSelect(row.segment_id)
  }
  const keyboard = (event: KeyboardEvent) => {
    const index = Math.max(
      0,
      props.rows.findIndex((row) => row.segment_id === props.selected),
    )
    const step: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowUp: 10,
      ArrowDown: -10,
      PageUp: -10,
      PageDown: 10,
    }
    let next = step[event.key] === undefined ? null : index + (step[event.key] ?? 0)
    if (event.key === "Home") next = 0
    if (event.key === "End") next = props.rows.length - 1
    if (next === null) return
    event.preventDefault()
    const row = props.rows[Math.max(0, Math.min(props.rows.length - 1, next))]
    if (row) props.onSelect(row.segment_id)
  }
  return {
    hover,
    drag,
    keyboard,
    handlers: {
      onPointerDown: (event: PointerEvent<SVGSVGElement>) => {
        if (!event.isPrimary || event.button !== 0) return
        scanning.current =
          event.target instanceof Element && event.target.closest("[data-scan]") !== null
        origin.current = point(event)
        event.currentTarget.setPointerCapture(event.pointerId)
      },
      onPointerMove: (event: PointerEvent<SVGSVGElement>) => {
        const x = point(event)
        setHover(x)
        if (origin.current !== null && scanning.current) pick(x)
        else if (origin.current !== null) setDrag([origin.current, x])
      },
      onPointerUp: (event: PointerEvent<SVGSVGElement>) => {
        const start = origin.current,
          end = point(event)
        origin.current = null
        setDrag(null)
        if (start === null) return
        if (
          !scanning.current &&
          Math.abs(end - start) * event.currentTarget.getBoundingClientRect().width > 8
        )
          props.onRange({ from: meters(Math.min(start, end)), to: meters(Math.max(start, end)) })
        else pick(end)
      },
      onPointerCancel: () => {
        origin.current = null
        setDrag(null)
      },
      onPointerLeave: () => {
        if (origin.current === null) setHover(null)
      },
    },
  }
}
