import { clsx } from "clsx"
import { type PipeSummary, type SegmentDetail, useThickness } from "@/entities/pipe"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { Button, Card, Stat, StatGrid, StatusBadge } from "@/shared/ui"
import { FeatureTable } from "./feature-table"
import { ObservationList } from "./observation-list"
import styles from "./segment-inspector.module.css"

export interface SegmentInspectorProps {
  readonly pipe: PipeSummary
  readonly detail: SegmentDetail
  readonly stale: boolean
  readonly onSelect: (segmentId: number) => void
}

export function SegmentInspector({ pipe, detail, stale, onSelect }: SegmentInspectorProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const thickness = useThickness()
  const row = detail.segment
  const loss = detail.nominal_wall_mm - row.forecast_mm
  return (
    <Card
      className={clsx(styles.inspector, stale && styles.stale)}
      aria-busy={stale || undefined}
      title={t("inspector:title", { segment: row.segment_id })}
    >
      <header className={styles.head}>
        <p className={styles.range}>{thickness.range(row.start_m, row.end_m)}</p>
        {row.priority_rank === null ? (
          <StatusBadge tone="muted" icon="check" size="compact" label={t("inspector:outside")} />
        ) : (
          <StatusBadge
            tone="warning"
            size="compact"
            label={t("inspector:rank", { rank: row.priority_rank, count: pipe.priority_count })}
          />
        )}
      </header>
      <StatGrid>
        <Stat
          size="large"
          className={styles.lead}
          label={t("inspector:forecast", { date: format.date(pipe.target_date) })}
          value={thickness.value(row.forecast_mm)}
          unit={t("pipe:unit.mmShort")}
        />
        <Stat
          label={t("inspector:interval")}
          value={t("pipe:unit.span", {
            from: thickness.value(row.p10_mm),
            to: thickness.value(row.p90_mm),
          })}
          unit={t("pipe:unit.mmShort")}
          hint={t("inspector:intervalHint")}
        />
        <Stat
          label={t("inspector:nominal")}
          value={thickness.value(detail.nominal_wall_mm)}
          unit={t("pipe:unit.mmShort")}
        />
        <Stat
          label={t("inspector:loss")}
          value={thickness.value(loss)}
          unit={t("pipe:unit.mmShort")}
          hint={t("inspector:lossHint", { percent: format.percent(loss / detail.nominal_wall_mm) })}
        />
      </StatGrid>
      <Card className={styles.block} title={t("inspector:runs")}>
        <ObservationList mode={pipe.mode} observations={row.observations} />
      </Card>
      <Card className={styles.block} title={t("inspector:features")}>
        <FeatureTable features={detail.features} />
        <p className={styles.note}>{t("inspector:featuresNote")}</p>
      </Card>
      <nav className={styles.nav} aria-label={t("inspector:navLabel")}>
        <Button
          variant="secondary"
          size="compact"
          icon="chevron-left"
          disabled={detail.previous_id === null}
          onClick={() => detail.previous_id !== null && onSelect(detail.previous_id)}
        >
          {t("inspector:previous")}
        </Button>
        <Button
          variant="secondary"
          size="compact"
          icon="chevron-right"
          disabled={detail.next_id === null}
          onClick={() => detail.next_id !== null && onSelect(detail.next_id)}
        >
          {t("inspector:next")}
        </Button>
      </nav>
    </Card>
  )
}
