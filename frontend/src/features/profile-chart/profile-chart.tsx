import { type KeyboardEvent, useMemo, useRef } from "react"
import { type DistanceRange, type SegmentRow, useThickness } from "@/entities/pipe"
import { useElementWidth } from "@/shared/hooks"
import { useTranslation } from "@/shared/i18n"
import { chartBox, linearScale } from "./chart-scale"
import { ProfileAxes } from "./profile-axes"
import styles from "./profile-chart.module.css"
import { ProfileLayers } from "./profile-layers"
import { thicknessDomain, visibleRows } from "./profile-model"
import { ProfileTag } from "./profile-tag"
import { useChartPointer } from "./use-chart-pointer"

export interface ProfileChartProps {
  readonly rows: readonly SegmentRow[]
  readonly runDates: readonly string[]
  readonly nominal: number
  readonly reject: number | null
  readonly selected: number | null
  readonly range: DistanceRange
  readonly onSelect: (segmentId: number) => void
  readonly onRange: (range: DistanceRange) => void
  readonly height?: number
}

const KEY_STEP: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowDown: -1,
  ArrowRight: 1,
  ArrowUp: 1,
  PageDown: -10,
  PageUp: 10,
}

export function ProfileChart({
  rows,
  runDates,
  nominal,
  reject,
  selected,
  range,
  onSelect,
  onRange,
  height = 320,
}: ProfileChartProps) {
  const { t } = useTranslation()
  const thickness = useThickness()
  const frame = useRef<HTMLDivElement>(null)
  const width = useElementWidth(frame, 720)
  const box = chartBox(width, height)
  const shown = useMemo(() => visibleRows(rows, range), [rows, range])
  const x = linearScale([range.from, range.to], [box.left, box.right])
  const y = linearScale(thicknessDomain(shown, nominal, reject), [box.bottom, box.top])
  const pointer = useChartPointer({ rows, x, onSelect, onRange })
  const current = selected === null ? undefined : rows[selected]
  const hovered = pointer.hover === null ? undefined : rows[pointer.hover]

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = rows.length - 1
    const base = selected ?? 0
    const step = KEY_STEP[event.key]
    let next: number | null = null
    if (step !== undefined) next = Math.min(last, Math.max(0, base + step))
    if (event.key === "Home") next = 0
    if (event.key === "End") next = last
    if (next === null) return
    event.preventDefault()
    onSelect(next)
  }

  const valueText =
    current === undefined
      ? t("profile:noSelection")
      : t("profile:valueText", {
          segment: current.segment_id,
          range: thickness.range(current.start_m, current.end_m),
          value: thickness.withUnit(current.forecast_mm),
        })

  return (
    <div
      ref={frame}
      className={styles.frame}
      role="slider"
      tabIndex={0}
      aria-label={t("profile:label")}
      aria-valuemin={0}
      aria-valuemax={rows.length - 1}
      aria-valuenow={selected ?? 0}
      aria-valuetext={valueText}
      onKeyDown={onKeyDown}
    >
      <svg className={styles.svg} width={box.width} height={box.height} aria-hidden="true">
        <ProfileAxes box={box} x={x} y={y} nominal={nominal} reject={reject} />
        <ProfileLayers rows={shown} runDates={runDates} x={x} y={y} />
        {shown
          .filter((row) => row.priority_rank !== null)
          .map((row) => (
            <rect
              key={`p-${row.segment_id}`}
              className={styles.priority}
              x={x.at(row.start_m)}
              y={box.bottom - 6}
              width={Math.max(1.5, x.at(row.end_m) - x.at(row.start_m))}
              height={6}
            />
          ))}
        {hovered === undefined ? null : (
          <ProfileTag row={hovered} x={x} y={y} box={box} tone="hover" />
        )}
        {current === undefined ? null : (
          <ProfileTag row={current} x={x} y={y} box={box} tone="selected" />
        )}
        {pointer.dragBox === null ? null : (
          <rect
            className={styles.dragBox}
            x={Math.min(...pointer.dragBox)}
            y={box.top}
            width={Math.abs(pointer.dragBox[1] - pointer.dragBox[0])}
            height={box.bottom - box.top}
          />
        )}
        <rect
          className={styles.overlay}
          x={box.left}
          y={box.top}
          width={Math.max(1, box.right - box.left)}
          height={Math.max(1, box.bottom - box.top)}
          {...pointer.handlers}
        />
      </svg>
    </div>
  )
}
