import { type MessageKey, useFormatters, useTranslation } from "@/shared/i18n"
import { DataTable } from "@/shared/ui"
import type { Quality } from "../reference.types"
import { layerSummary } from "./quality-model"
import styles from "./quality-tables.module.css"

const LAYER: Readonly<Record<string, MessageKey>> = {
  raw: "quality:sources.layerNames.raw",
  core: "quality:sources.layerNames.core",
  quarantine: "quality:sources.layerNames.quarantine",
  mart: "quality:sources.layerNames.mart",
}

export function SourcesTable({ tables }: { readonly tables: Quality["tables"] }) {
  const { t } = useTranslation()
  const format = useFormatters()
  return (
    <DataTable
      label={t("quality:sources.title")}
      density="compact"
      head={
        <tr>
          <th scope="col">{t("quality:sources.table")}</th>
          <th scope="col" data-numeric="">
            {t("quality:sources.rows")}
          </th>
        </tr>
      }
    >
      {tables
        .filter((table) => table.layer === "raw")
        .map((table) => (
          <tr key={table.table}>
            <th scope="row">
              <code className={styles.code}>{table.table}</code>
            </th>
            <td data-numeric="">{format.integer(table.rows)}</td>
          </tr>
        ))}
    </DataTable>
  )
}

export function LayerSummaryTable({ tables }: { readonly tables: Quality["tables"] }) {
  const { t } = useTranslation()
  const format = useFormatters()
  return (
    <DataTable
      label={t("quality:sources.layers")}
      density="compact"
      head={
        <tr>
          <th scope="col">{t("quality:sources.layer")}</th>
          <th scope="col" data-numeric="">
            {t("quality:sources.tables")}
          </th>
          <th scope="col" data-numeric="">
            {t("quality:sources.rows")}
          </th>
        </tr>
      }
    >
      {layerSummary(tables).map((item) => {
        const key = LAYER[item.layer]
        return (
          <tr key={item.layer}>
            <th scope="row">{key === undefined ? <code>{item.layer}</code> : t(key)}</th>
            <td data-numeric="">{format.integer(item.tables)}</td>
            <td data-numeric="">{format.integer(item.rows)}</td>
          </tr>
        )
      })}
    </DataTable>
  )
}
