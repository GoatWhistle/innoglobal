import { useThickness } from "@/entities/pipe"
import { trackValue, type WorkspaceProps } from "@/features/engineering-variants"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { NoValue, Stat, StatGrid } from "@/shared/ui"
import styles from "./dashboard-figures.module.css"

export function DashboardFigures({ workspace }: { readonly workspace: WorkspaceProps }) {
  const { t } = useTranslation(),
    format = useFormatters(),
    thickness = useThickness()
  const { profile, pipe, range, baselineDate: date } = workspace
  const nominal = pipe.passport.nominal_wall_mm
  const rows = profile.rows.filter((r) => r.end_m > range.from && r.start_m < range.to)
  const thinnest = rows.reduce<(typeof rows)[number] | undefined>(
    (min, r) => (min === undefined || r.forecast_mm < min.forecast_mm ? r : min),
    undefined,
  )
  const losses = rows
    .map((r) => ({ row: r, value: trackValue(r, "delta", date, nominal) }))
    .filter((item): item is { row: (typeof rows)[number]; value: number } => item.value !== null)
  const worst = losses.reduce<(typeof losses)[number] | undefined>(
    (min, item) => (min === undefined || item.value < min.value ? item : min),
    undefined,
  )
  const queued = rows.filter((r) => r.priority_rank !== null).length
  const mm = t("pipe:unit.mmShort")
  return (
    <StatGrid look="ruled" className={styles.figures}>
      <Stat
        label={t("variants:dash.figureMin")}
        value={thinnest ? format.number(thinnest.forecast_mm, 2) : <NoValue />}
        unit={thinnest ? mm : undefined}
        hint={thinnest ? thickness.range(thinnest.start_m, thinnest.end_m) : undefined}
      />
      <Stat
        label={t("variants:dash.figureQueue")}
        value={format.integer(queued)}
        hint={t("variants:dash.figureQueueHint", {
          total: format.integer(rows.length),
        })}
      />
      <Stat
        label={t("variants:dash.figureLoss")}
        value={worst ? format.number(worst.value, 2) : <NoValue />}
        unit={worst ? mm : undefined}
        hint={worst ? thickness.range(worst.row.start_m, worst.row.end_m) : undefined}
      />
      <Stat
        label={t("variants:dash.figureRun")}
        value={pipe.last_observed_run ? format.date(pipe.last_observed_run) : <NoValue />}
        hint={
          pipe.last_observed_min_mm === null
            ? undefined
            : t("variants:dash.figureRunHint", {
                value: thickness.withUnit(pipe.last_observed_min_mm),
              })
        }
      />
    </StatGrid>
  )
}
