import { useThickness } from "@/entities/pipe"
import { useMediaQuery } from "@/shared/hooks"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { ButtonLink, Card, Disclosure, StatusBadge } from "@/shared/ui"
import { SegmentEvidence } from "./evidence/segment-evidence"
import styles from "./segment-facts.module.css"
import { observed } from "./track-model"
import type { WorkspaceProps } from "./variant-types"

export function SegmentFacts({
  pipe,
  row,
  profile,
  comparisonDate,
  detailsOnly = false,
}: WorkspaceProps & { readonly comparisonDate?: string | null; readonly detailsOnly?: boolean }) {
  const { t } = useTranslation()
  const narrow = useFactsLayout(detailsOnly)
  const format = useFormatters()
  const thickness = useThickness()
  const inspectionDate = sourceDate(pipe, comparisonDate)
  const baseline = observed(row, inspectionDate ?? undefined, pipe.passport.nominal_wall_mm)
  const baseDate = inspectionDate ?? pipe.passport.commissioned_at
  const showHeading = !narrow
  const increase = baseline !== null && row.forecast_mm > baseline
  const baselineLabel = inspectionDate
    ? t("variants:vtdDate", { date: format.date(inspectionDate) })
    : t("variants:nominalBase")
  const rankLabel =
    row.priority_rank === null
      ? t("inspector:outside")
      : t("inspector:rank", { rank: row.priority_rank, count: pipe.priority_count })
  const measurements = (
    <>
      <dl className={styles.numbers}>
        <div>
          <dt>{t("inspector:nominal")}</dt>
          <dd>{thickness.withUnit(pipe.passport.nominal_wall_mm)}</dd>
        </div>
        <div>
          <dt>{t("inspector:interval")}</dt>
          <dd>
            {t("pipe:unit.span", {
              from: thickness.value(row.p10_mm),
              to: thickness.withUnit(row.p90_mm),
            })}
          </dd>
        </div>
        <div>
          <dt>{comparisonDate === undefined ? t("variants:lastVtd") : baselineLabel}</dt>
          <dd>
            {(inspectionDate || comparisonDate === null) && baseline !== null
              ? thickness.withUnit(baseline)
              : t("variants:missing")}
          </dd>
        </div>
        <div>
          <dt>{t("variants:horizon")}</dt>
          <dd>
            {baseDate
              ? t("variants:days", {
                  count: Math.round(
                    (Date.parse(pipe.target_date) - Date.parse(baseDate)) / 86400000,
                  ),
                })
              : t("variants:missing")}
          </dd>
        </div>
      </dl>
      <p className={styles.note}>{t("inspector:intervalHint")}</p>
      {increase && !narrow ? (
        <p className={styles.warning}>
          {t("variants:increase", { value: thickness.withUnit(row.forecast_mm - baseline) })}{" "}
          <ButtonLink variant="quiet" icon="chart" to="/model">
            {t("variants:modelExplanation")}
          </ButtonLink>
        </p>
      ) : null}
    </>
  )
  return (
    <div className={styles.facts} data-testid="segment-facts">
      {showHeading ? (
        <>
          <Card
            appearance="plain"
            className={styles.heading}
            title={t("inspector:title", { segment: row.segment_id })}
            description={thickness.range(row.start_m, row.end_m)}
          >
            {null}
          </Card>
          <div className={styles.value}>
            <span>{t("variants:forecast")}</span>
            <strong className={styles.reading} data-testid="forecast-value">
              {thickness.value(row.forecast_mm)}
              <small>{t("pipe:unit.mmShort")}</small>
            </strong>
            <span>{format.date(pipe.target_date)}</span>
          </div>
          <StatusBadge tone={row.priority_rank === null ? "muted" : "warning"} label={rankLabel} />
        </>
      ) : null}
      {measurements}
      <SegmentEvidence pipe={pipe} segment={row.segment_id} />
      <SegmentSources pipe={pipe} row={row} profile={profile} />
    </div>
  )
}

function sourceDate(pipe: WorkspaceProps["pipe"], comparisonDate: string | null | undefined) {
  return comparisonDate === undefined ? pipe.last_observed_run : comparisonDate
}

function SegmentSources({ pipe, row, profile }: Pick<WorkspaceProps, "pipe" | "row" | "profile">) {
  const { t } = useTranslation()
  const format = useFormatters()
  const thickness = useThickness()
  return (
    <Disclosure title={t("variants:sources")}>
      <div className={styles.sources}>
        <p>
          {t("variants:forecastSource", { model: pipe.predictor, snapshot: profile.snapshot_id })}
        </p>
        <p>{t("variants:nominalSource")}</p>
        {row.observations.length ? (
          row.observations.map((item) => (
            <p key={item.run_date}>
              {t("variants:vtdSource", {
                date: format.date(item.run_date),
                value:
                  item.residual_mm === null
                    ? t("variants:missing")
                    : thickness.withUnit(item.residual_mm),
              })}
            </p>
          ))
        ) : (
          <p>{t("variants:noVtd")}</p>
        )}
        <p>{t("variants:noUzt")}</p>
      </div>
    </Disclosure>
  )
}

function useFactsLayout(detailsOnly: boolean) {
  const narrow = useMediaQuery("(width < 48rem)")
  return narrow || detailsOnly
}
