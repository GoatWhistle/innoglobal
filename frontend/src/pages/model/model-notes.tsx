import { useTranslation } from "@/shared/i18n"
import { Card } from "@/shared/ui"
import styles from "./model-page.module.css"

export interface ModelNotesProps {
  readonly quantiles: readonly string[]
}

const LIMITS = ["level", "pearson", "quantiles", "neighbours", "regime"] as const

export function ModelNotes({ quantiles }: ModelNotesProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.notes}>
      <Card className={styles.panel} title={t("model:uncertainty.title")}>
        <ul className={styles.list}>
          <li>{t("model:uncertainty.quantiles", { quantiles: quantiles.join(", ") })}</li>
          <li>{t("model:uncertainty.coverage")}</li>
          <li>{t("model:uncertainty.bound")}</li>
        </ul>
      </Card>
      <Card className={styles.panel} title={t("model:limits.title")}>
        <ul className={styles.limits}>
          {LIMITS.map((key) => (
            <li key={key}>{t(`model:limits.${key}`)}</li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
