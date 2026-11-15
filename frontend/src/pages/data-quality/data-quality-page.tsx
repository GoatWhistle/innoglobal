import {
  ChecksTable,
  LayersTable,
  QuarantineTable,
  RunsTable,
  useQuality,
} from "@/entities/reference"
import { useDocumentTitle, useFormatters, useTranslation } from "@/shared/i18n"
import { Card, NoValue, PageHeader, QueryView, Skeleton, Stat, StatGrid } from "@/shared/ui"
import styles from "./data-quality-page.module.css"

export function DataQualityPage() {
  const { t } = useTranslation()
  const format = useFormatters()
  const quality = useQuality()
  useDocumentTitle(t("quality:pageTitle"))
  return (
    <div className={styles.page}>
      <PageHeader
        title={t("quality:title")}
        description={t("quality:description")}
        actions={
          quality.data?.checked_at ? (
            <p className={styles.checked}>
              {t("quality:checkedAt", { date: format.dateTime(quality.data.checked_at) })}
            </p>
          ) : undefined
        }
      />
      <QueryView query={quality} label={t("quality:loading")} skeleton={<Skeleton lines={12} />}>
        {(data) => {
          const errors = data.checks.filter((check) => check.severity === "error")
          const failedErrors = errors.filter((check) => check.failed > 0).length
          const quarantined = data.quarantine.reduce((sum, row) => sum + row.rows, 0)
          return (
            <div className={styles.grid}>
              <StatGrid look="ruled" className={styles.summary}>
                <Stat
                  label={t("quality:summary.errors")}
                  value={t("quality:summary.errorsValue", {
                    failed: failedErrors,
                    total: errors.length,
                  })}
                  hint={t("quality:summary.errorsHint")}
                />
                <Stat
                  label={t("quality:summary.quarantine")}
                  value={format.integer(quarantined)}
                  hint={t("quality:summary.quarantineHint")}
                />
                {data.regime.map((item) => (
                  <Stat
                    key={item.pipe_id}
                    label={t("quality:summary.regime", { pipe: item.pipe_id })}
                    value={format.integer(item.days)}
                    unit={t("quality:summary.days")}
                    hint={
                      item.first_day === null || item.last_day === null ? (
                        <NoValue />
                      ) : (
                        t("quality:summary.regimeSpan", {
                          from: format.date(item.first_day),
                          to: format.date(item.last_day),
                        })
                      )
                    }
                  />
                ))}
              </StatGrid>
              <Card
                appearance="ruled"
                className={styles.wide}
                title={t("quality:runs.title")}
                description={t("quality:runs.description")}
              >
                <RunsTable runs={data.runs} />
              </Card>
              <Card
                appearance="ruled"
                className={styles.wide}
                title={t("quality:checks.title")}
                description={t("quality:checks.description")}
              >
                <ChecksTable checks={data.checks} />
              </Card>
              <Card
                appearance="ruled"
                title={t("quality:quarantine.title")}
                description={t("quality:quarantine.description")}
              >
                <QuarantineTable rows={data.quarantine} />
              </Card>
              <Card
                appearance="ruled"
                title={t("quality:layers.title")}
                description={t("quality:layers.description")}
              >
                <LayersTable tables={data.tables} />
              </Card>
            </div>
          )
        }}
      </QueryView>
    </div>
  )
}
