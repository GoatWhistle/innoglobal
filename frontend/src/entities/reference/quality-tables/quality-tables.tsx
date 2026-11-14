import { type MessageKey, useFormatters, useTranslation } from "@/shared/i18n"
import { DataTable, NoValue, StatusBadge, type StatusTone } from "@/shared/ui"
import type { Quality, QualityCheck } from "../reference.types"

const EXCLUSION: Readonly<Record<string, MessageKey>> = {
  "run predates commissioning: replaced pipe": "quality:runs.replaced",
}

const QUARANTINE: Readonly<Record<string, MessageKey>> = {
  out_of_pipe_bounds: "quality:quarantine.out_of_pipe_bounds",
  duplicate: "quality:quarantine.duplicate",
  duplicate_day_superseded: "quality:quarantine.duplicate_day_superseded",
  duplicate_distance: "quality:quarantine.duplicate_distance",
}

function checkTone(check: QualityCheck): { tone: StatusTone; key: MessageKey } {
  if (check.failed === 0) return { tone: "normal", key: "quality:checks.passed" }
  if (check.severity === "error") return { tone: "danger", key: "quality:checks.failed" }
  if (check.severity === "warn") return { tone: "warning", key: "quality:checks.found" }
  return { tone: "muted", key: "quality:checks.info" }
}

export function RunsTable({ runs }: { readonly runs: Quality["runs"] }) {
  const { t } = useTranslation()
  const format = useFormatters()
  return (
    <DataTable
      label={t("quality:runs.title")}
      head={
        <tr>
          <th scope="col">{t("quality:runs.pipe")}</th>
          <th scope="col">{t("quality:runs.date")}</th>
          <th scope="col" data-numeric="">
            {t("quality:runs.features")}
          </th>
          <th scope="col" data-numeric="">
            {t("quality:runs.minimum")}
          </th>
          <th scope="col">{t("quality:runs.status")}</th>
        </tr>
      }
    >
      {runs.map((run) => {
        const reason = run.exclusion_reason
        const reasonKey = reason === null ? undefined : EXCLUSION[reason]
        return (
          <tr key={`${run.pipe_id}-${run.run_date}`}>
            <th scope="row">{run.pipe_id}</th>
            <td>{format.date(run.run_date)}</td>
            <td data-numeric="">{format.integer(run.n_features)}</td>
            <td data-numeric="">
              {run.min_residual_mm === null ? <NoValue /> : format.number(run.min_residual_mm, 2)}
            </td>
            <td>
              {run.is_training_eligible ? (
                <StatusBadge tone="normal" size="compact" label={t("quality:runs.used")} />
              ) : (
                <StatusBadge
                  tone="off"
                  size="compact"
                  label={
                    reasonKey === undefined ? (reason ?? t("quality:runs.excluded")) : t(reasonKey)
                  }
                />
              )}
            </td>
          </tr>
        )
      })}
    </DataTable>
  )
}

export function ChecksTable({ checks }: { readonly checks: Quality["checks"] }) {
  const { t } = useTranslation()
  const format = useFormatters()
  return (
    <DataTable
      label={t("quality:checks.title")}
      head={
        <tr>
          <th scope="col">{t("quality:checks.name")}</th>
          <th scope="col">{t("quality:checks.meaning")}</th>
          <th scope="col" data-numeric="">
            {t("quality:checks.rows")}
          </th>
          <th scope="col">{t("quality:checks.result")}</th>
        </tr>
      }
    >
      {checks.map((check) => {
        const status = checkTone(check)
        return (
          <tr key={check.name}>
            <th scope="row">
              <code>{check.name}</code>
            </th>
            <td lang="ru">{check.description ?? <NoValue />}</td>
            <td data-numeric="">
              {t("quality:checks.ratio", {
                failed: format.integer(check.failed),
                total: format.integer(check.total),
              })}
            </td>
            <td>
              <StatusBadge tone={status.tone} size="compact" label={t(status.key)} />
            </td>
          </tr>
        )
      })}
    </DataTable>
  )
}

export function QuarantineTable({ rows }: { readonly rows: Quality["quarantine"] }) {
  const { t } = useTranslation()
  const format = useFormatters()
  return (
    <DataTable
      label={t("quality:quarantine.title")}
      density="compact"
      head={
        <tr>
          <th scope="col">{t("quality:quarantine.table")}</th>
          <th scope="col">{t("quality:quarantine.reason")}</th>
          <th scope="col" data-numeric="">
            {t("quality:quarantine.rows")}
          </th>
        </tr>
      }
    >
      {rows.map((row) => {
        const key = QUARANTINE[row.reason]
        return (
          <tr key={`${row.table}-${row.reason}`}>
            <th scope="row">
              <code>{row.table}</code>
            </th>
            <td>{key === undefined ? <code>{row.reason}</code> : t(key)}</td>
            <td data-numeric="">{format.integer(row.rows)}</td>
          </tr>
        )
      })}
    </DataTable>
  )
}

export function LayersTable({ tables }: { readonly tables: Quality["tables"] }) {
  const { t } = useTranslation()
  const format = useFormatters()
  return (
    <DataTable
      label={t("quality:layers.title")}
      density="compact"
      head={
        <tr>
          <th scope="col">{t("quality:layers.table")}</th>
          <th scope="col" data-numeric="">
            {t("quality:layers.rows")}
          </th>
        </tr>
      }
    >
      {tables.map((table) => (
        <tr key={`${table.layer}.${table.table}`}>
          <th scope="row">
            <code>{`${table.layer}.${table.table}`}</code>
          </th>
          <td data-numeric="">{format.integer(table.rows)}</td>
        </tr>
      ))}
    </DataTable>
  )
}
