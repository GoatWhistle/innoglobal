import { type Quality, type QualityVerdict, tableRows } from "@/entities/reference"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { NoValue, Stat, StatGrid } from "@/shared/ui"
import styles from "./data-quality-page.module.css"

interface QualityFiguresProps {
  readonly data: Quality
  readonly verdict: QualityVerdict
}

export function QualityFigures({ data, verdict }: QualityFiguresProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const count = (value: number | undefined) =>
    value === undefined ? <NoValue /> : format.integer(value)
  const used = data.runs.filter((run) => run.is_training_eligible).length
  const covered = new Set(data.runs.map((run) => run.pipe_id)).size
  return (
    <section aria-label={t("quality:figures.label")}>
      <StatGrid look="ruled" className={styles.figures}>
        <Stat
          label={t("quality:figures.pipes")}
          value={count(tableRows(data, "core", "pipe"))}
          hint={t("quality:figures.pipesHint", { covered: format.integer(covered) })}
        />
        <Stat
          label={t("quality:figures.segments")}
          value={count(tableRows(data, "core", "segment"))}
          hint={t("quality:figures.segmentsHint", {
            mart: format.integer(tableRows(data, "mart", "ili_segment") ?? 0),
          })}
        />
        <Stat
          label={t("quality:figures.runs")}
          value={format.integer(data.runs.length)}
          hint={t("quality:figures.runsHint", {
            used: format.integer(used),
            excluded: format.integer(data.runs.length - used),
          })}
        />
        <Stat
          label={t("quality:figures.defects")}
          value={count(tableRows(data, "core", "ili_feature"))}
          hint={t("quality:figures.defectsHint", {
            quarantined: format.integer(tableRows(data, "quarantine", "ili_feature") ?? 0),
          })}
        />
        <Stat
          className={styles.divided}
          label={t("quality:figures.passed")}
          value={t("quality:figures.passedValue", {
            passed: format.integer(verdict.passed),
            total: format.integer(verdict.total),
          })}
          hint={t("quality:figures.passedHint")}
        />
        <Stat
          label={t("quality:figures.failed")}
          value={
            <span className={verdict.requiredFailed > 0 ? styles.danger : undefined}>
              {format.integer(verdict.requiredFailed)}
            </span>
          }
          hint={t("quality:figures.failedHint", { total: format.integer(verdict.required) })}
        />
        <Stat
          label={t("quality:figures.warnings")}
          value={
            <span className={verdict.warnings > 0 ? styles.warning : undefined}>
              {format.integer(verdict.warnings)}
            </span>
          }
          hint={t("quality:figures.warningsHint", { info: format.integer(verdict.info) })}
        />
      </StatGrid>
    </section>
  )
}
