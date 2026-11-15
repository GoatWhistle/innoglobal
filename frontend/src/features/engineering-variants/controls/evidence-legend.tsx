import { useFormatters, useTranslation } from "@/shared/i18n"
import styles from "./evidence-legend.module.css"

export function EvidenceLegend({ date }: { readonly date?: string | undefined }) {
  const { t } = useTranslation()
  const format = useFormatters()
  return (
    <ul className={styles.legend}>
      <li>
        <i className={styles.forecast} />
        {t("variants:forecastShort")}
      </li>
      <li>
        <i className={date ? styles.observation : styles.nominal} />
        {date ? t("variants:vtdDate", { date: format.date(date) }) : t("variants:nominalBase")}
      </li>
      <li>
        <i className={styles.interval} />
        {t("inspector:interval")} {t("inspector:intervalHint")}
      </li>
    </ul>
  )
}
