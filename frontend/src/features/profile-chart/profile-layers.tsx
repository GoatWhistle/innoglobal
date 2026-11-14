import type { SegmentRow } from "@/entities/pipe"
import { pathOf, type Scale } from "./chart-scale"
import styles from "./profile-chart.module.css"

export interface ProfileLayersProps {
  readonly rows: readonly SegmentRow[]
  readonly runDates: readonly string[]
  readonly x: Scale
  readonly y: Scale
}

function center(row: SegmentRow): number {
  return (row.start_m + row.end_m) / 2
}

export function ProfileLayers({ rows, runDates, x, y }: ProfileLayersProps) {
  const upper = rows.map((row) => [x.at(center(row)), y.at(row.p90_mm)] as const)
  const lower = rows.map((row) => [x.at(center(row)), y.at(row.p10_mm)] as const).reverse()
  const band = upper.length > 0 ? `${pathOf([...upper, ...lower])}Z` : ""
  const forecast = pathOf(rows.map((row) => [x.at(center(row)), y.at(row.forecast_mm)] as const))
  const latest = runDates.at(-1)
  return (
    <g>
      <path className={styles.band} d={band} />
      <path className={styles.bandEdge} d={pathOf(lower)} />
      {runDates.map((run) => (
        <g key={run} className={run === latest ? styles.runLatest : styles.runEarlier}>
          {rows.flatMap((row) =>
            row.observations
              .filter((item) => item.run_date === run)
              .map((item) => (
                <circle
                  key={`${run}-${row.segment_id}`}
                  className={item.had_defect ? styles.defect : styles.modal}
                  cx={x.at(center(row))}
                  cy={y.at(item.residual_mm)}
                  r={item.had_defect ? 2 : 1.5}
                />
              )),
          )}
        </g>
      ))}
      <path className={styles.forecast} d={forecast} />
    </g>
  )
}
