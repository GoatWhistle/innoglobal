import { type PipeSummary, type SegmentRow, useThickness } from "@/entities/pipe"
import { useTranslation } from "@/shared/i18n"
import styles from "./scene-readout.module.css"

export interface SceneReadoutProps {
  readonly pipe: PipeSummary
  readonly row: SegmentRow
  readonly mode: string
}
export function SceneReadout({ pipe, row, mode }: SceneReadoutProps) {
  const { t } = useTranslation()
  const thickness = useThickness()
  const observed = row.observations.at(-1)
  return (
    <div className={styles.readout} data-mode={mode}>
      <div className={styles.label}>
        <span>{t("pipe:scene.segment", { id: row.segment_id })}</span>
        <span>{thickness.range(row.start_m, row.end_m)}</span>
      </div>
      <p className={styles.figure}>
        <strong className={styles.number}>{thickness.value(row.forecast_mm)}</strong>
        <span>{t("pipe:unit.mmShort")}</span>
      </p>
      <p className={styles.caption}>{t("pipe:scene.forecast")}</p>
      {row.priority_rank === null ? null : (
        <p className={styles.priority}>
          {t("inspector:rank", { rank: row.priority_rank, count: pipe.priority_count })}
        </p>
      )}
      <dl className={styles.facts}>
        <div>
          <dt>{t("inspector:nominal")}</dt>
          <dd>{thickness.withUnit(pipe.passport.nominal_wall_mm)}</dd>
        </div>
        {observed ? (
          <div>
            <dt>{observed.run_date}</dt>
            <dd>{thickness.withUnit(observed.residual_mm)}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t("inspector:interval")}</dt>
          <dd>
            {t("pipe:unit.span", {
              from: thickness.value(row.p10_mm),
              to: thickness.withUnit(row.p90_mm),
            })}
          </dd>
        </div>
      </dl>
    </div>
  )
}
