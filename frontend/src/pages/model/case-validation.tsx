import { CASE_TITLE } from "@/entities/pipe"
import { type ModelValidation, modelKey } from "@/entities/reference"
import { ValidationComparison } from "@/features/validation-comparison"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { Card, Stat, StatGrid } from "@/shared/ui"
import { ModelImportance } from "./model-importance"
import styles from "./model-page.module.css"
import { ModelRanking, VISIBLE_LIMIT } from "./model-ranking"

export interface CaseValidationProps {
  readonly model: ModelValidation
  readonly caseId: string
}

export function CaseValidation({ model, caseId }: CaseValidationProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const target = model.cases.find((item) => item.case_id === caseId)
  const metrics = model.metrics
    .filter((item) => item.case_id === caseId)
    .sort((a, b) => b.pearson_r2 - a.pearson_r2)
  const comparison = model.comparisons.find((item) => item.case_id === caseId)
  const pair = model.pairs.find((item) => item.case_id === caseId)
  const selected = metrics.find((item) => item.is_selected)
  const name = (id: string) => {
    const key = modelKey(id)
    return key === null ? <code>{id}</code> : t(key)
  }
  if (target === undefined) return null
  return (
    <Card
      id={caseId}
      appearance="ruled"
      className={styles.case}
      actions={
        <span className={styles.caseMeta}>
          {t("model:case.pipe", { pipe: target.pipe_id, date: format.date(target.target_date) })}
        </span>
      }
      title={t(CASE_TITLE[target.mode])}
      description={
        pair === undefined
          ? undefined
          : t(
              pair.start === "commissioning"
                ? "model:pair.fromCommissioning"
                : "model:pair.between",
              {
                pipes: format.list(pair.pipe_ids.map(String)),
                start: pair.start === "commissioning" ? "" : format.date(pair.start),
                end: format.date(pair.end),
              },
            )
      }
    >
      {selected === undefined ? null : (
        <StatGrid look="ruled" className={styles.figures}>
          <Stat label={t("model:selected")} value={name(selected.model)} />
          <Stat
            label={t("model:r2")}
            value={format.number(selected.pearson_r2, 3)}
            hint={t("model:r2Hint")}
          />
          <Stat
            label={t("model:mae")}
            value={format.number(selected.mae_mm, 3)}
            unit={t("pipe:unit.mmShort")}
            hint={t("model:maeHint")}
          />
          <Stat
            label={t("model:segments")}
            value={format.integer(selected.segments)}
            hint={t("model:segmentsHint")}
          />
        </StatGrid>
      )}
      <div className={styles.row}>
        <Card
          className={styles.panel}
          title={t("model:metricsTitle")}
          description={
            metrics.length > VISIBLE_LIMIT
              ? t("model:metricsNote", { total: metrics.length, shown: VISIBLE_LIMIT })
              : t("model:metricsAll", { total: metrics.length })
          }
        >
          <ModelRanking metrics={metrics} name={name} />
        </Card>
        <ModelImportance model={model} caseId={caseId} />
        {comparison === undefined ? null : <ValidationComparison comparison={comparison} />}
      </div>
    </Card>
  )
}
