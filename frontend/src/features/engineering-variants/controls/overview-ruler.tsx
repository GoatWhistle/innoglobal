import { wallColor, wallStep } from "@/entities/pipe"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { useTrackInput } from "../use-track-input"
import type { WorkspaceProps } from "../variant-types"
import styles from "./overview-ruler.module.css"

export function OverviewRuler(props: WorkspaceProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const total = props.pipe.passport.length_m
  const input = useTrackInput({
    ...props,
    selected: props.row.segment_id,
    rows: props.profile.rows,
    range: { from: 0, to: total },
  })
  const x = (m: number) => (m / total) * 1000
  return (
    <div className={styles.ruler}>
      <div className={styles.labels}>
        <span>{t("variants:entirePipe")}</span>
        <span>
          {format.integer(total)} {t("variants:meter")}
        </span>
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label={t("variants:entirePipe")}
        aria-valuemin={0}
        aria-valuemax={props.profile.rows.at(-1)?.segment_id ?? 0}
        aria-valuenow={props.row.segment_id}
        onKeyDown={input.keyboard}
      >
        <svg
          className={styles.canvas}
          viewBox="0 0 1000 44"
          preserveAspectRatio="none"
          aria-hidden="true"
          {...input.handlers}
        >
          {props.profile.rows.map((row) => (
            <rect
              key={row.segment_id}
              x={x(row.start_m)}
              y={12}
              width={Math.max(1, x(row.end_m - row.start_m))}
              height={20}
              fill={wallColor(
                wallStep(
                  row.forecast_mm,
                  props.pipe.passport.nominal_wall_mm,
                  props.pipe.thinnest_mm,
                ),
              )}
            />
          ))}
          <rect
            x={x(props.range.from)}
            y={4}
            width={Math.max(2, x(props.range.to - props.range.from))}
            height={36}
            className={styles.window}
          />
          <line
            x1={x(props.row.start_m)}
            x2={x(props.row.start_m)}
            y1={0}
            y2={44}
            className={styles.marker}
          />
        </svg>
      </div>
    </div>
  )
}
