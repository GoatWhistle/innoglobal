import type { SegmentRow } from "@/entities/pipe"
import { trackValue, useTrackInput, type WorkspaceProps } from "@/features/engineering-variants"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { ChartCursor } from "./chart-cursor"
import { ChartFrame } from "./chart-frame"
import { ChartLegend, type LegendMark } from "./chart-legend"
import { bandPath, linePath } from "./chart-paths"
import { createScale, useChartBox } from "./chart-scale"
import styles from "./dashboard-charts.module.css"

function domainOf(rows: readonly SegmentRow[], nominal: number, floor: number | null) {
  const values = rows.flatMap((r) => [r.p10_mm, r.p90_mm, r.forecast_mm])
  const low = Math.min(...values, floor ?? Infinity, nominal),
    high = Math.max(...values, nominal)
  const pad = (high - low) * 0.08 || 0.5
  return [Math.max(0, low - pad), high + pad] as const
}
export function ProfileChart({ workspace }: { readonly workspace: WorkspaceProps }) {
  const { t } = useTranslation(),
    format = useFormatters()
  const { profile, pipe, range, row, baselineDate: date } = workspace
  const box = useChartBox<HTMLDivElement>()
  const input = useTrackInput({
    ...workspace,
    rows: profile.rows,
    selected: row.segment_id,
  })
  const nominal = pipe.passport.nominal_wall_mm,
    reject = pipe.passport.reject_wall_mm
  const rows = profile.rows.filter((r) => r.end_m > range.from && r.start_m < range.to)
  const domain = domainOf(rows.length ? rows : profile.rows, nominal, reject)
  const scale = createScale(box.width, box.height, range, domain)
  const observed = (r: SegmentRow) => (date ? trackValue(r, "observed", date, nominal) : null)
  const mm = (v: number) => format.number(v, 2)
  const base = observed(row)
  const legend: { mark: LegendMark; label: string }[] = [
    {
      mark: "forecast",
      label: t("variants:dash.legendForecast", {
        date: format.date(pipe.target_date),
      }),
    },
    { mark: "band", label: t("variants:dash.legendBand") },
    ...(date
      ? [
          {
            mark: "observed" as const,
            label: t("variants:vtdDate", { date: format.date(date) }),
          },
        ]
      : []),
    {
      mark: "nominal",
      label: t("variants:dash.legendNominal", { value: mm(nominal) }),
    },
    {
      mark: "cutoff",
      label: t("variants:dash.legendCutoff", {
        value: mm(pipe.priority_cutoff_mm),
      }),
    },
    ...(reject === null
      ? []
      : [
          {
            mark: "reject" as const,
            label: t("variants:dash.legendReject", { value: mm(reject) }),
          },
        ]),
  ]
  const reading = t("variants:dash.profileReading", {
    segment: row.segment_id,
    forecast: mm(row.forecast_mm),
    low: mm(row.p10_mm),
    high: mm(row.p90_mm),
  })
  const level = (v: number, className: string | undefined) => (
    <line x1={0} x2={scale.width} y1={scale.y(v)} y2={scale.y(v)} className={className} />
  )
  return (
    <div className={styles.chart}>
      <ChartLegend
        items={legend}
        reading={
          base === null
            ? reading
            : `${reading}; ${t("variants:dash.baseReading", { value: mm(base) })}`
        }
      />
      <div className={styles.profileBody}>
        <ChartFrame
          label={t("variants:dash.forecast")}
          valueText={reading}
          value={[
            profile.rows[0]?.segment_id ?? 0,
            profile.rows.at(-1)?.segment_id ?? 0,
            row.segment_id,
          ]}
          unit={t("pipe:unit.mmShort")}
          scale={scale}
          domain={domain}
          range={range}
          plotRef={box.ref}
          digits={1}
          svg={input.handlers}
          onKeyDown={input.keyboard}
        >
          <path
            d={bandPath(
              rows,
              scale,
              (r) => r.p90_mm,
              (r) => r.p10_mm,
            )}
            className={styles.band}
          />
          {level(nominal, styles.nominal)}
          {level(pipe.priority_cutoff_mm, styles.cutoff)}
          {reject === null ? null : level(reject, styles.reject)}
          <path d={linePath(rows, scale, (r) => r.forecast_mm)} className={styles.forecast} />
          {date
            ? rows.map((r) => {
                const v = observed(r)
                return v === null ? null : (
                  <circle
                    key={r.segment_id}
                    cx={scale.x((r.start_m + r.end_m) / 2)}
                    cy={scale.y(v)}
                    r={2}
                    className={styles.observed}
                  />
                )
              })
            : null}
          <ChartCursor scale={scale} row={row} input={input} />
        </ChartFrame>
      </div>
    </div>
  )
}
