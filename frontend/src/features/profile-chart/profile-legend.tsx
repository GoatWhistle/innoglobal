import { clsx } from "clsx"
import { useFormatters, useTranslation } from "@/shared/i18n"
import styles from "./profile-legend.module.css"

export interface ProfileLegendProps {
  readonly runDates: readonly string[]
  readonly targetDate: string
  readonly hasReject: boolean
}

export function ProfileLegend({ runDates, targetDate, hasReject }: ProfileLegendProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const latest = runDates.at(-1)
  return (
    <ul className={styles.legend}>
      <li className={styles.item}>
        <span className={clsx(styles.swatch, styles.forecast)} aria-hidden="true" />
        {t("profile:legend.forecast", { date: format.date(targetDate) })}
      </li>
      <li className={styles.item}>
        <span className={clsx(styles.swatch, styles.band)} aria-hidden="true" />
        {t("profile:legend.band")}
      </li>
      {runDates.map((run) => (
        <li key={run} className={styles.item}>
          <span
            className={clsx(styles.dot, run === latest ? styles.latest : styles.earlier)}
            aria-hidden="true"
          />
          {t("profile:legend.run", { date: format.date(run) })}
        </li>
      ))}
      {runDates.length > 0 ? (
        <li className={styles.item}>
          <span className={clsx(styles.dot, styles.hollow)} aria-hidden="true" />
          {t("profile:legend.modal")}
        </li>
      ) : null}
      <li className={styles.item}>
        <span className={clsx(styles.swatch, styles.nominal)} aria-hidden="true" />
        {t("profile:legend.nominal")}
      </li>
      {hasReject ? (
        <li className={styles.item}>
          <span className={clsx(styles.swatch, styles.reject)} aria-hidden="true" />
          {t("profile:legend.reject")}
        </li>
      ) : null}
      <li className={styles.item}>
        <span className={clsx(styles.swatch, styles.priority)} aria-hidden="true" />
        {t("profile:legend.priority")}
      </li>
    </ul>
  )
}
