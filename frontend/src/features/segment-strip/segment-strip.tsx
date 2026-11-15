import { type PointerEvent, useRef, useState } from "react"
import { type DistanceRange, indexAt, type SegmentRow, wallColor, wallStep } from "@/entities/pipe"
import { useElementWidth } from "@/shared/hooks"
import { useTranslation } from "@/shared/i18n"
import styles from "./segment-strip.module.css"

export interface SegmentStripProps {
  readonly rows: readonly SegmentRow[]
  readonly nominal: number
  readonly thinnest: number
  readonly selected: number | null
  readonly range: DistanceRange
  readonly onSelect: (segmentId: number) => void
  readonly onRange: (range: DistanceRange) => void
}

const LEFT = 44
const RIGHT = 18
const RELIEF = 34
const BAND = 18
const HEIGHT = RELIEF + BAND + 6
const DRAG_PX = 6

function elevationPath(rows: readonly SegmentRow[], at: (m: number) => number): string {
  const values = rows.map((row) => row.elevation_m).filter((v): v is number => v !== null)
  if (values.length === 0) return ""
  const low = Math.min(...values)
  const span = Math.max(...values) - low || 1
  return rows
    .filter((row) => row.elevation_m !== null)
    .map((row, index) => {
      const y = RELIEF - 2 - (((row.elevation_m ?? low) - low) / span) * (RELIEF - 6)
      return `${index === 0 ? "M" : "L"}${at((row.start_m + row.end_m) / 2).toFixed(1)} ${y.toFixed(1)}`
    })
    .join("")
}

export function SegmentStrip({
  rows,
  nominal,
  thinnest,
  selected,
  range,
  onSelect,
  onRange,
}: SegmentStripProps) {
  const { t } = useTranslation()
  const frame = useRef<HTMLDivElement>(null)
  const width = useElementWidth(frame, 720)
  const origin = useRef<number | null>(null)
  const [drag, setDrag] = useState<readonly [number, number] | null>(null)
  const total = rows.at(-1)?.end_m ?? 1
  const inner = Math.max(1, width - LEFT - RIGHT)
  const at = (m: number) => LEFT + (m / total) * inner
  const toMeters = (px: number) => Math.min(total, Math.max(0, ((px - LEFT) / inner) * total))
  const local = (event: PointerEvent<Element>) =>
    event.clientX - event.currentTarget.getBoundingClientRect().left + LEFT
  const current = selected === null ? undefined : rows.find((row) => row.segment_id === selected)

  const onPointerUp = (event: PointerEvent<SVGRectElement>) => {
    const start = origin.current
    const end = local(event)
    origin.current = null
    setDrag(null)
    if (start === null) return
    if (Math.abs(end - start) > DRAG_PX) {
      onRange({ from: toMeters(Math.min(start, end)), to: toMeters(Math.max(start, end)) })
      return
    }
    const row = rows[indexAt(rows, toMeters(end))]
    if (row !== undefined) onSelect(row.segment_id)
  }

  return (
    <div ref={frame} className={styles.frame} aria-hidden="true">
      <svg
        role="img"
        aria-label={t("profile:relief")}
        className={styles.svg}
        width={width}
        height={HEIGHT}
      >
        <text className={styles.caption} x={LEFT - 6} y={RELIEF / 2} textAnchor="end">
          {t("profile:relief")}
        </text>
        <path className={styles.relief} d={elevationPath(rows, at)} />
        {rows.map((row) => (
          <rect
            key={row.segment_id}
            x={at(row.start_m)}
            y={RELIEF}
            width={Math.max(0.6, at(row.end_m) - at(row.start_m) + 0.4)}
            height={BAND}
            fill={wallColor(wallStep(row.forecast_mm, nominal, thinnest))}
          />
        ))}
        <rect
          className={styles.window}
          x={at(range.from)}
          y={1}
          width={Math.max(2, at(range.to) - at(range.from))}
          height={HEIGHT - 2}
        />
        {current === undefined ? null : (
          <line
            className={styles.marker}
            x1={at((current.start_m + current.end_m) / 2)}
            x2={at((current.start_m + current.end_m) / 2)}
            y1={RELIEF - 4}
            y2={RELIEF + BAND + 4}
          />
        )}
        {drag === null ? null : (
          <rect
            className={styles.drag}
            x={Math.min(...drag)}
            y={RELIEF}
            width={Math.abs(drag[1] - drag[0])}
            height={BAND}
          />
        )}
        <rect
          className={styles.overlay}
          x={LEFT}
          y={0}
          width={inner}
          height={HEIGHT}
          onPointerDown={(event) => {
            origin.current = local(event)
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            const start = origin.current
            const now = local(event)
            if (start !== null && Math.abs(now - start) > DRAG_PX) setDrag([start, now])
          }}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            origin.current = null
            setDrag(null)
          }}
        />
      </svg>
    </div>
  )
}
