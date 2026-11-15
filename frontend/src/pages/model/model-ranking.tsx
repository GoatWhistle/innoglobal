import type { ReactNode } from "react"
import type { ModelValidation } from "@/entities/reference"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { BarList, Disclosure, StatusBadge } from "@/shared/ui"
import styles from "./model-page.module.css"

type Metric = ModelValidation["metrics"][number]

export interface ModelRankingProps {
  readonly metrics: readonly Metric[]
  readonly name: (id: string) => ReactNode
}

const VISIBLE_LIMIT = 5

export function ModelRanking({ metrics, name }: ModelRankingProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const best = Math.max(...metrics.map((item) => item.pearson_r2), 1e-9)
  const shown = (item: Metric, index: number) =>
    index < VISIBLE_LIMIT || item.is_selected || item.is_baseline
  const visible = metrics.filter(shown)
  const rest = metrics.filter((item, index) => !shown(item, index))
  const toItem = (item: Metric) => ({
    id: item.model,
    label: (
      <span className={styles.modelName}>
        {name(item.model)}
        {item.is_selected ? (
          <StatusBadge tone="normal" size="compact" label={t("model:badgeSelected")} />
        ) : null}
        {item.is_baseline ? (
          <StatusBadge tone="muted" icon="minus" size="compact" label={t("model:badgeBaseline")} />
        ) : null}
      </span>
    ),
    share: item.pearson_r2 / best,
    value: format.number(item.pearson_r2, 3),
    meta: t("model:maeMeta", { value: format.number(item.mae_mm, 3) }),
    emphasis: item.is_selected,
  })
  return (
    <>
      <BarList label={t("model:metricsTitle")} items={visible.map(toItem)} />
      {rest.length === 0 ? null : (
        <Disclosure title={t("model:metricsRest", { total: rest.length })}>
          <BarList
            label={t("model:metricsRest", { total: rest.length })}
            items={rest.map(toItem)}
          />
        </Disclosure>
      )}
    </>
  )
}
