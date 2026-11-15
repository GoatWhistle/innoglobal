import { clsx } from "clsx"
import type { ReactNode } from "react"
import styles from "./chart-legend.module.css"

export type LegendMark =
  | "forecast"
  | "band"
  | "observed"
  | "nominal"
  | "reject"
  | "cutoff"
  | "loss"
  | "gain"
const MARK_CLASS: Readonly<Record<LegendMark, string | undefined>> = {
  forecast: undefined,
  band: styles.band,
  observed: styles.observed,
  nominal: styles.nominal,
  reject: styles.reject,
  cutoff: styles.cutoff,
  loss: styles.loss,
  gain: styles.gain,
}
export function ChartLegend({
  items,
  reading,
}: {
  readonly items: readonly {
    readonly mark: LegendMark
    readonly label: string
  }[]
  readonly reading: ReactNode
}) {
  return (
    <div className={styles.bar}>
      <ul className={styles.legend}>
        {items.map((item) => (
          <li key={item.mark}>
            <i className={clsx(styles.mark, MARK_CLASS[item.mark])} />
            {item.label}
          </li>
        ))}
      </ul>
      <p className={styles.reading}>{reading}</p>
    </div>
  )
}
