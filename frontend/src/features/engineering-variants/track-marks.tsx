import type { SegmentRow } from "@/entities/pipe"
import styles from "./track-marks.module.css"
import { observed, trackValue } from "./track-model"
import type { TrackKind } from "./variant-types"

interface TrackMarksProps {
  readonly rows: readonly SegmentRow[]
  readonly kind: TrackKind
  readonly date: string | undefined
  readonly nominal: number
  readonly x: (value: number) => number
  readonly y: (value: number) => number
  readonly clip: string | undefined
  readonly overlay: boolean | undefined
}
interface MarkProps extends Omit<TrackMarksProps, "rows" | "overlay"> {
  readonly row: SegmentRow
}
function SegmentMark({ row, kind, date, nominal, x, y, clip }: MarkProps) {
  const value = trackValue(row, kind, date, nominal)
  if (value === null) return null
  const start = Math.max(0, x(row.start_m))
  const end = Math.min(1000, x(row.end_m))
  const width = Math.max(0.8, end - start)
  if (kind === "priority")
    return <rect x={start} y={8} width={width} height={16} className={styles.priority} />
  if (kind === "delta")
    return (
      <rect
        x={start}
        y={Math.min(y(value), y(0))}
        width={width}
        height={Math.max(1, Math.abs(y(value) - y(0)))}
        className={value > 0 ? styles.positive : styles.delta}
      />
    )
  const className =
    kind === "observed"
      ? date
        ? styles.observed
        : styles.nominal
      : kind === "elevation"
        ? styles.relief
        : styles.forecast
  return (
    <g clipPath={clip}>
      {kind === "forecast" ? (
        <rect
          x={start}
          y={y(row.p90_mm)}
          width={width}
          height={Math.max(1, y(row.p10_mm) - y(row.p90_mm))}
          className={styles.band}
        />
      ) : null}
      <line x1={start} x2={end} y1={y(value)} y2={y(value)} className={className} />
      {kind === "observed" && date ? (
        <circle cx={(start + end) / 2} cy={y(value)} r={1.8} className={styles.dot} />
      ) : null}
    </g>
  )
}
export function TrackMarks(props: TrackMarksProps) {
  return (
    <>
      {props.rows.map((row) => (
        <SegmentMark key={row.segment_id} {...props} row={row} />
      ))}
      {props.overlay
        ? props.rows.map((row) => {
            const value = observed(row, props.date, props.nominal)
            return value === null ? null : (
              <line
                key={row.segment_id}
                x1={props.x(row.start_m)}
                x2={props.x(row.end_m)}
                y1={props.y(value)}
                y2={props.y(value)}
                className={props.date ? styles.observed : styles.nominal}
              />
            )
          })
        : null}
    </>
  )
}
