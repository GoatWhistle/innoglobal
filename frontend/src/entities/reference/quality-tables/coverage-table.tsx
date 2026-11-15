import { useFormatters, useTranslation } from "@/shared/i18n"
import { DataTable, NoValue, StatusBadge } from "@/shared/ui"
import type { Quality } from "../reference.types"
import { type PipeCoverage, pipeCoverage } from "./quality-model"
import styles from "./quality-tables.module.css"

const REPLACED = "run predates commissioning: replaced pipe"

function CoverageStatus({ row }: { readonly row: PipeCoverage }) {
  const { t } = useTranslation()
  if (row.eligible)
    return <StatusBadge tone="normal" size="compact" label={t("quality:coverage.used")} />
  return (
    <StatusBadge
      tone="off"
      size="compact"
      label={t(row.reason === REPLACED ? "quality:coverage.replaced" : "quality:coverage.excluded")}
    />
  )
}

export function PipeCoverageTable({ data }: { readonly data: Quality }) {
  const { t } = useTranslation()
  const format = useFormatters()
  return (
    <DataTable
      label={t("quality:coverage.title")}
      density="compact"
      head={
        <tr>
          <th scope="col">{t("quality:coverage.pipe")}</th>
          <th scope="col">{t("quality:coverage.runs")}</th>
          <th scope="col" data-numeric="">
            {t("quality:coverage.features")}
          </th>
          <th scope="col" data-numeric="">
            {t("quality:coverage.minimum")}
          </th>
          <th scope="col" data-numeric="">
            {t("quality:coverage.regime")}
          </th>
          <th scope="col">{t("quality:coverage.status")}</th>
        </tr>
      }
    >
      {pipeCoverage(data).map((row) => (
        <tr key={row.pipeId} data-muted={row.eligible ? undefined : ""} className={styles.row}>
          <th scope="row" className={styles.nowrap}>
            {row.pipeId}
          </th>
          <td className={styles.nowrap}>
            {format.list(row.runs.map((run) => String(new Date(run.run_date).getFullYear())))}
          </td>
          <td data-numeric="">{format.integer(row.features)}</td>
          <td data-numeric="">
            {row.minResidual === null ? <NoValue /> : format.number(row.minResidual, 2)}
          </td>
          <td data-numeric="">
            {row.regimeDays === null ? <NoValue /> : format.integer(row.regimeDays)}
          </td>
          <td className={styles.status}>
            <CoverageStatus row={row} />
          </td>
        </tr>
      ))}
    </DataTable>
  )
}
