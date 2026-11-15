import { useThickness } from "@/entities/pipe"
import { useTranslation } from "@/shared/i18n"
import { ButtonLink, StatusBadge } from "@/shared/ui"
import { observed } from "../track-model"
import type { WorkspaceProps } from "../variant-types"
import styles from "./focus-summary.module.css"

export function FocusSummary({
  pipe,
  row,
  comparisonDate,
}: WorkspaceProps & { readonly comparisonDate?: string | null | undefined }) {
  const { t } = useTranslation()
  const thickness = useThickness()
  const date = comparisonDate === undefined ? pipe.last_observed_run : comparisonDate
  const baseline = observed(row, date ?? undefined, pipe.passport.nominal_wall_mm)
  return (
    <div className={styles.summary}>
      <div className={styles.readout}>
        <div>
          <strong>{t("inspector:title", { segment: row.segment_id })}</strong>
          <span>{thickness.range(row.start_m, row.end_m)}</span>
        </div>
        <div>
          <span>{t("variants:forecastShort")}</span>
          <strong className={styles.value} data-testid="forecast-value">
            {thickness.withUnit(row.forecast_mm)}
          </strong>
        </div>
      </div>
      <StatusBadge
        tone={row.priority_rank === null ? "muted" : "warning"}
        label={
          row.priority_rank === null
            ? t("inspector:outside")
            : t("inspector:rank", { rank: row.priority_rank, count: pipe.priority_count })
        }
      />
      {baseline !== null && row.forecast_mm > baseline ? (
        <div className={styles.warning}>
          <p>
            {t("variants:increaseShort", { value: thickness.withUnit(row.forecast_mm - baseline) })}
          </p>
          <ButtonLink variant="quiet" icon="chart" to="/model">
            {t("variants:modelExplanation")}
          </ButtonLink>
        </div>
      ) : null}
    </div>
  )
}
