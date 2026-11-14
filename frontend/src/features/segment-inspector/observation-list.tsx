import { CASE_START, type ForecastMode, type Observation, useThickness } from "@/entities/pipe"
import { useFormatters, useTranslation } from "@/shared/i18n"
import styles from "./segment-inspector.module.css"

export interface ObservationListProps {
  readonly mode: ForecastMode
  readonly observations: readonly Observation[]
}

export function ObservationList({ mode, observations }: ObservationListProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const thickness = useThickness()
  const describe = (item: Observation) => {
    if (!item.had_defect) return t("inspector:noDefects")
    if (item.max_depth_pct === null) return t("inspector:defects", { count: item.n_metal_loss })
    return t("inspector:defectsDepth", {
      count: item.n_metal_loss,
      depth: format.number(item.max_depth_pct, 0),
    })
  }
  if (observations.length === 0) return <p className={styles.note}>{t(CASE_START[mode])}</p>
  return (
    <ul className={styles.runs}>
      {[...observations].reverse().map((item) => (
        <li key={item.run_date} className={styles.run}>
          <span className={styles.runDate}>{format.date(item.run_date)}</span>
          <span className={styles.runValue}>{thickness.withUnit(item.residual_mm)}</span>
          <span className={styles.runNote}>{describe(item)}</span>
        </li>
      ))}
    </ul>
  )
}
