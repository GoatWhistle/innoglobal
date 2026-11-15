import type { SegmentRow } from "@/entities/pipe"
import type { ChartScale } from "./chart-scale"
import styles from "./dashboard-charts.module.css"

export function ChartCursor({
  scale,
  row,
  input,
}: {
  readonly scale: ChartScale
  readonly row: SegmentRow
  readonly input: {
    readonly hover: number | null
    readonly drag: readonly [number, number] | null
  }
}) {
  const selected = scale.x((row.start_m + row.end_m) / 2)
  const vertical = (x: number, className: string | undefined) => (
    <line x1={x} x2={x} y1={0} y2={scale.height} className={className} />
  )
  return (
    <>
      {input.hover === null ? null : vertical(input.hover * scale.width, styles.hover)}
      {selected >= 0 && selected <= scale.width ? vertical(selected, styles.selected) : null}
      {input.drag ? (
        <rect
          x={Math.min(...input.drag) * scale.width}
          width={Math.abs(input.drag[1] - input.drag[0]) * scale.width}
          height={scale.height}
          className={styles.drag}
        />
      ) : null}
    </>
  )
}
