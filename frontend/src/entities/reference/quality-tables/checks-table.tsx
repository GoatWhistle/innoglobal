import { type MessageKey, useFormatters, useTranslation } from "@/shared/i18n"
import { DataTable, NoValue, StatusBadge, type StatusTone } from "@/shared/ui"
import type { Quality } from "../reference.types"
import { type CheckStatus, checkStatus, failedShare, sortChecks } from "./quality-model"
import styles from "./quality-tables.module.css"

const STATUS: Readonly<Record<CheckStatus, { tone: StatusTone; key: MessageKey }>> = {
  failed: { tone: "danger", key: "quality:checks.failed" },
  warning: { tone: "warning", key: "quality:checks.found" },
  info: { tone: "muted", key: "quality:checks.info" },
  passed: { tone: "normal", key: "quality:checks.passed" },
}

export function ChecksTable({ checks }: { readonly checks: Quality["checks"] }) {
  const { t } = useTranslation()
  const format = useFormatters()
  return (
    <DataTable
      label={t("quality:checks.title")}
      density="compact"
      head={
        <tr>
          <th scope="col">{t("quality:checks.result")}</th>
          <th scope="col">{t("quality:checks.name")}</th>
          <th scope="col">{t("quality:checks.meaning")}</th>
          <th scope="col" data-numeric="">
            {t("quality:checks.rows")}
          </th>
          <th scope="col" data-numeric="">
            {t("quality:checks.share")}
          </th>
        </tr>
      }
    >
      {sortChecks(checks).map((check) => {
        const status = STATUS[checkStatus(check)]
        return (
          <tr key={check.name}>
            <td className={styles.status}>
              <StatusBadge tone={status.tone} size="compact" label={t(status.key)} />
            </td>
            <th scope="row">
              <code className={styles.code}>{check.name}</code>
            </th>
            <td lang="ru" className={styles.meaning}>
              {check.description ?? <NoValue />}
            </td>
            <td data-numeric="" className={styles.nowrap}>
              {t("quality:checks.ratio", {
                failed: format.integer(check.failed),
                total: format.integer(check.total),
              })}
            </td>
            <td data-numeric="" className={styles.nowrap}>
              {check.failed === 0 ? <NoValue /> : format.percent(failedShare(check), 1)}
            </td>
          </tr>
        )
      })}
    </DataTable>
  )
}
