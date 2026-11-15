import {
  ChecksPanel,
  LayerSummaryTable,
  LayersTable,
  PipeCoverageTable,
  type Quality,
  QuarantineTable,
  qualityVerdict,
  SourcesTable,
  useQuality,
} from "@/entities/reference"
import { useDocumentTitle, useFormatters, useTranslation } from "@/shared/i18n"
import { Card, Disclosure, PageHeader, QueryView, Skeleton } from "@/shared/ui"
import styles from "./data-quality-page.module.css"
import { QualityFigures } from "./quality-figures"

function QualityVerdictLine({ data }: { readonly data: Quality }) {
  const { t } = useTranslation()
  const format = useFormatters()
  const verdict = qualityVerdict(data)
  return (
    <span className={styles.verdict} data-state={verdict.requiredFailed > 0 ? "broken" : "clean"}>
      {verdict.requiredFailed > 0
        ? t("quality:verdict.broken", {
            failed: format.integer(verdict.requiredFailed),
            total: format.integer(verdict.required),
          })
        : t("quality:verdict.clean", {
            total: format.integer(verdict.required),
            warnings: format.integer(verdict.warnings),
            quarantined: format.integer(verdict.quarantined),
          })}
    </span>
  )
}

function QualityBody({ data }: { readonly data: Quality }) {
  const { t } = useTranslation()
  const verdict = qualityVerdict(data)
  return (
    <div className={styles.body}>
      <QualityFigures data={data} verdict={verdict} />
      <div className={styles.row}>
        <Card title={t("quality:coverage.title")} description={t("quality:coverage.description")}>
          <PipeCoverageTable data={data} />
        </Card>
        <div className={styles.stack}>
          <Card title={t("quality:sources.title")} description={t("quality:sources.description")}>
            <div className={styles.pair}>
              <SourcesTable tables={data.tables} />
              <LayerSummaryTable tables={data.tables} />
            </div>
            <Disclosure title={t("quality:sources.allTables", { count: data.tables.length })}>
              <LayersTable tables={data.tables} />
            </Disclosure>
          </Card>
          <Card
            title={t("quality:quarantine.title")}
            description={t("quality:quarantine.description")}
          >
            <QuarantineTable rows={data.quarantine} />
          </Card>
        </div>
      </div>
      <Card title={t("quality:checks.title")} description={t("quality:checks.description")}>
        <ChecksPanel checks={data.checks} />
      </Card>
    </div>
  )
}

export function DataQualityPage() {
  const { t } = useTranslation()
  const format = useFormatters()
  const quality = useQuality()
  useDocumentTitle(t("quality:pageTitle"))
  return (
    <div className={styles.page}>
      <PageHeader
        title={t("quality:title")}
        description={quality.data ? <QualityVerdictLine data={quality.data} /> : undefined}
        actions={
          quality.data ? (
            <p className={styles.checked}>
              {quality.data.checked_at === null ? null : (
                <span>
                  {t("quality:checkedAt", { date: format.dateTime(quality.data.checked_at) })}
                </span>
              )}
              <code>{t("quality:snapshot", { id: quality.data.snapshot_id })}</code>
            </p>
          ) : undefined
        }
      />
      <QueryView query={quality} label={t("quality:loading")} skeleton={<Skeleton lines={12} />}>
        {(data) => <QualityBody data={data} />}
      </QueryView>
    </div>
  )
}
