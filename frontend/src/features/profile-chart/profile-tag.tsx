import { type SegmentRow, useThickness } from "@/entities/pipe"
import type { ChartBox, Scale } from "./chart-scale"
import styles from "./profile-chart.module.css"

export interface ProfileTagProps {
  readonly row: SegmentRow
  readonly x: Scale
  readonly y: Scale
  readonly box: ChartBox
  readonly tone: "hover" | "selected"
}

const TAG_WIDTH = 84
const TAG_GAP = 8

export function ProfileTag({ row, x, y, box, tone }: ProfileTagProps) {
  const thickness = useThickness()
  const cx = x.at((row.start_m + row.end_m) / 2)
  if (cx < box.left || cx > box.right) return null
  const cy = y.at(row.forecast_mm)
  const flip = cx + TAG_GAP + TAG_WIDTH > box.right
  const tx = flip ? cx - TAG_GAP - TAG_WIDTH : cx + TAG_GAP
  const selected = tone === "selected"
  return (
    <g className={selected ? styles.selected : styles.hover}>
      <line className={styles.cursor} x1={cx} x2={cx} y1={box.top} y2={box.bottom} />
      <circle className={styles.ring} cx={cx} cy={cy} r={selected ? 5 : 3.5} />
      {selected ? (
        <g transform={`translate(${tx.toFixed(1)} ${(box.top + 4).toFixed(1)})`}>
          <rect className={styles.tagBox} width={TAG_WIDTH} height={22} rx={4} />
          <text className={styles.tagText} x={TAG_WIDTH / 2} y={15} textAnchor="middle">
            {thickness.withUnit(row.forecast_mm)}
          </text>
        </g>
      ) : null}
    </g>
  )
}
