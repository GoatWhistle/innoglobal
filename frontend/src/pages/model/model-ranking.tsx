import type { ReactNode } from "react"
import type { ModelValidation } from "@/entities/reference"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { DataTable, Disclosure, StatusBadge } from "@/shared/ui"
import styles from "./model-page.module.css"

type Metric = ModelValidation["metrics"][number]

export interface ModelRankingProps {
  readonly metrics: readonly Metric[]
  readonly name: (id: string) => ReactNode
}

interface RankingTableProps extends ModelRankingProps {
  readonly label: string
}

export const VISIBLE_LIMIT = 10

function RankingTable({ metrics, name, label }: RankingTableProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  return (
    <DataTable
      label={label}
      density="compact"
      head={
        <tr>
          <th scope="col">{t("model:rank.model")}</th>
          <th scope="col" data-numeric="">
            {t("model:rank.r2")}
          </th>
          <th scope="col" data-numeric="">
            {t("model:rank.mae")}
          </th>
        </tr>
      }
    >
      {metrics.map((item) => (
        <tr key={item.model} aria-selected={item.is_selected}>
          <th scope="row" className={styles.modelCell}>
            <span className={styles.modelName}>
              {name(item.model)}
              {item.is_selected ? (
                <StatusBadge tone="normal" size="compact" label={t("model:badgeSelected")} />
              ) : null}
              {item.is_baseline ? (
                <StatusBadge
                  tone="muted"
                  icon="minus"
                  size="compact"
                  label={t("model:badgeBaseline")}
                />
              ) : null}
            </span>
          </th>
          <td data-numeric="">{format.number(item.pearson_r2, 3)}</td>
          <td data-numeric="">{format.number(item.mae_mm, 3)}</td>
        </tr>
      ))}
    </DataTable>
  )
}

export function ModelRanking({ metrics, name }: ModelRankingProps) {
  const { t } = useTranslation()
  const shown = (item: Metric, index: number) =>
    index < VISIBLE_LIMIT || item.is_selected || item.is_baseline
  const visible = metrics.filter(shown)
  const rest = metrics.filter((item, index) => !shown(item, index))
  const restLabel = t("model:metricsRest", { total: rest.length })
  return (
    <>
      <RankingTable metrics={visible} name={name} label={t("model:metricsTitle")} />
      {rest.length === 0 ? null : (
        <Disclosure title={restLabel}>
          <RankingTable metrics={rest} name={name} label={restLabel} />
        </Disclosure>
      )}
    </>
  )
}
