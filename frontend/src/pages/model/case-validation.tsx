import { CASE_TITLE } from "@/entities/pipe"
import { featureKey, type ModelValidation, modelKey } from "@/entities/reference"
import { ValidationComparison } from "@/features/validation-comparison"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { BarList, Card, Stat, StatGrid } from "@/shared/ui"
import styles from "./model-page.module.css"
import { ModelRanking } from "./model-ranking"

export interface CaseValidationProps {
  readonly model: ModelValidation
  readonly caseId: string
}

const IMPORTANCE_LIMIT = 10

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
  const importance = model.importance
    .filter((item) => item.case_id === caseId)
    .slice(0, IMPORTANCE_LIMIT)
  const top = Math.max(...importance.map((item) => item.share), 1e-9)
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
      actions={t("model:case.pipe", {
        pipe: target.pipe_id,
        date: format.date(target.target_date),
      })}
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
        <StatGrid look="ruled">
          <Stat
            className={styles.selectedModel}
            label={t("model:selected")}
            value={name(selected.model)}
          />
          <Stat
            label={t("model:r2")}
            value={format.number(selected.pearson_r2, 3)}
            hint={t("model:r2Hint")}
          />
          <Stat
            label={t("model:mae")}
            value={format.number(selected.mae_mm, 3)}
            unit={t("pipe:unit.mmShort")}
          />
          <Stat
            label={t("model:segments")}
            value={format.integer(selected.segments)}
            hint={t("model:segmentsHint")}
          />
        </StatGrid>
      )}
      <div className={styles.columns}>
        <Card
          appearance="plain"
          className={styles.block}
          title={t("model:metricsTitle")}
          description={t("model:metricsNote", { total: metrics.length })}
        >
          <ModelRanking metrics={metrics} name={name} />
        </Card>
        <Card
          appearance="plain"
          className={styles.block}
          title={t("model:importanceTitle")}
          description={t("model:importanceNote", { total: importance.length })}
        >
          <BarList
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
      </div>
      {comparison === undefined ? null : <ValidationComparison comparison={comparison} />}
    </Card>
  )
}
