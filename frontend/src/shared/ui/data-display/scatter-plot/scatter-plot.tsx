import { useRef } from "react"
import { useElementWidth } from "../../../hooks"
import { useFormatters } from "../../../i18n"
import styles from "./scatter-plot.module.css"

export interface ScatterPoint {
  readonly id: string
  readonly x: number
  readonly y: number
}

export interface ScatterPlotProps {
  readonly points: readonly ScatterPoint[]
  readonly label: string
  readonly xLabel: string
  readonly yLabel: string
}

const START = 54

export function ScatterPlot({ points, label, xLabel, yLabel }: ScatterPlotProps) {
  const format = useFormatters()
  const frame = useRef<HTMLDivElement>(null)
  const width = useElementWidth(frame, 428)
  const size = Math.min(width, 428) - 28
  const end = size - 24
  const values = points.flatMap((point) => [point.x, point.y])
  const low = Math.floor(Math.min(...values, 0))
  const high = Math.max(low + 1, Math.ceil(Math.max(...values, 1)))
  const position = (value: number) => START + ((value - low) / (high - low)) * (end - START)
  const ticks = Array.from({ length: 5 }, (_, i) => low + ((high - low) * i) / 4)
  return (
    <div className={styles.frame} ref={frame}>
      <svg
        className={styles.plot}
        viewBox={`0 0 ${size + 28} ${size + 48}`}
        role="img"
        aria-label={label}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className={styles.grid}
              x1={START}
              x2={end}
              y1={size - position(tick)}
              y2={size - position(tick)}
            />
            <text
              className={styles.label}
              x={position(tick)}
              y={size - START + 22}
              textAnchor="middle"
            >
              {format.number(tick, 1)}
            </text>
            <text
              className={styles.label}
              x={START - 10}
              y={size - position(tick)}
              dy="0.32em"
              textAnchor="end"
            >
              {format.number(tick, 1)}
            </text>
          </g>
        ))}
        <path className={styles.axis} d={`M${START} ${size - end}V${size - START}H${end}`} />
        <line className={styles.identity} x1={START} x2={end} y1={size - START} y2={size - end} />
        {points.map((point) => (
          <circle
            key={point.id}
            className={styles.point}
            cx={position(point.x)}
            cy={size - position(point.y)}
            r={3}
          />
        ))}
        <text
          className={styles.title}
          x={(START + end) / 2}
          y={size - START + 48}
          textAnchor="middle"
        >
          {xLabel}
        </text>
        <text className={styles.title} x={START} y={size - end - 10}>
          {yLabel}
        </text>
      </svg>
    </div>
  )
}
