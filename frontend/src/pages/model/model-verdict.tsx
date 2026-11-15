import { CASE_SHORT } from "@/entities/pipe"
import type { ModelValidation } from "@/entities/reference"
import { useFormatters, useTranslation } from "@/shared/i18n"
import styles from "./model-page.module.css"

export interface ModelVerdictProps {
  readonly model: ModelValidation
}

export function ModelVerdict({ model }: ModelVerdictProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const parts = model.cases.flatMap((item) => {
    const selected = model.metrics.find(
      (metric) => metric.case_id === item.case_id && metric.is_selected,
    )
    if (selected === undefined) return []
    return [
      t("model:verdictCase", {
        case: t(CASE_SHORT[item.mode]),
        r2: format.number(selected.pearson_r2, 3),
        mae: format.number(selected.mae_mm, 3),
        n: format.integer(selected.segments),
      }),
    ]
  })
  if (parts.length === 0) return null
  return <p className={styles.verdict}>{t("model:verdict", { cases: format.list(parts) })}</p>
}
