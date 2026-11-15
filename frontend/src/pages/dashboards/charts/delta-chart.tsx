import type { SegmentRow } from "@/entities/pipe"
import { trackValue, useTrackInput, type WorkspaceProps } from "@/features/engineering-variants"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { ChartCursor } from "./chart-cursor"
import { ChartFrame } from "./chart-frame"
import { ChartLegend } from "./chart-legend"
import { binnedArea } from "./chart-paths"
import { createScale, useChartBox } from "./chart-scale"
import styles from "./dashboard-charts.module.css"

export function DeltaChart({ workspace }: { readonly workspace: WorkspaceProps }) {
  const { t } = useTranslation(),
    format = useFormatters()
  const { profile, pipe, range, row, baselineDate: date } = workspace
  const box = useChartBox<HTMLDivElement>()
  const input = useTrackInput({
    ...workspace,
    rows: profile.rows,
    selected: row.segment_id,
  })
  const nominal = pipe.passport.nominal_wall_mm
  const pick = (r: SegmentRow) => trackValue(r, "delta", date, nominal)
  const rows = profile.rows.filter((r) => r.end_m > range.from && r.start_m < range.to)
  const values = rows.map(pick).filter((v): v is number => v !== null)
  const span = Math.max(0.1, ...values.map(Math.abs)) * 1.1
  const domain = [-span, span] as const
  const scale = createScale(box.width, box.height, range, domain)
  const value = pick(row)
  const signed = (v: number) => `${v > 0 ? "+" : ""}${format.number(v, 2)}`
  const reading = t("variants:dash.deltaReading", {
    segment: row.segment_id,
    value: value === null ? t("variants:missing") : signed(value),
  })
  return (
    <div className={styles.chart}>
      <ChartLegend
        items={[
          { mark: "loss", label: t("variants:dash.legendLoss") },
          { mark: "gain", label: t("variants:dash.legendGain") },
        ]}
        reading={reading}
      />
      <div className={styles.deltaBody}>
        <ChartFrame
          label={t("variants:dash.delta")}
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
          digits={2}
          signed
          svg={input.handlers}
          onKeyDown={input.keyboard}
        >
          <path d={binnedArea(rows, scale, pick, -1)} className={styles.loss} />
          <path d={binnedArea(rows, scale, pick, 1)} className={styles.gain} />
          <line x1={0} x2={scale.width} y1={scale.y(0)} y2={scale.y(0)} className={styles.zero} />
          <ChartCursor scale={scale} row={row} input={input} />
        </ChartFrame>
      </div>
      <p className={styles.note}>
        {values.length
          ? t("variants:dash.deltaNote", {
              date: date ? format.date(date) : t("variants:nominalBase"),
              target: format.date(pipe.target_date),
            })
          : t("variants:noTrack")}
      </p>
    </div>
  )
}
