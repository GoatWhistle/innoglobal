import { featureKey, type ModelValidation } from "@/entities/reference"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { BarList, Card } from "@/shared/ui"
import styles from "./model-page.module.css"

export interface ModelImportanceProps {
  readonly model: ModelValidation
  readonly caseId: string
}

const IMPORTANCE_LIMIT = 16
const SHARE_FLOOR = 0.01

export function ModelImportance({ model, caseId }: ModelImportanceProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const importance = model.importance
    .filter((item) => item.case_id === caseId && item.share >= SHARE_FLOOR)
    .slice(0, IMPORTANCE_LIMIT)
  const top = Math.max(...importance.map((item) => item.share), 1e-9)
  return (
    <Card
      className={styles.panel}
      title={t("model:importanceTitle")}
      description={t("model:importanceNote", { total: importance.length })}
    >
      <BarList
        className={styles.bars}
        label={t("model:importanceTitle")}
        items={importance.map((item) => {
          const key = featureKey(item.feature)
          return {
            id: item.feature,
            label: key === null ? <code>{item.feature}</code> : t(key),
            share: item.share / top,
            value: format.percent(item.share, 1),
          }
        })}
      />
      <p className={styles.note}>
        {t(caseId === "case1" ? "model:importanceCatboost" : "model:importanceLgbm")}
      </p>
    </Card>
  )
}
