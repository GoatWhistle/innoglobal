import { type CSSProperties, useId } from "react"
import { useFormatters, useTranslation } from "@/shared/i18n"
import styles from "./aligned-track.module.css"
import { TrackMarks } from "./track-marks"
import { trackDomain, trackValue } from "./track-model"
import { useTrackInput } from "./use-track-input"
import type { TrackProps } from "./variant-types"

export function AlignedTrack(props: TrackProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const { profile, pipe, range, row, kind, date, overlay, split } = props
  const input = useTrackInput({ ...props, rows: profile.rows, selected: row.segment_id })
  const id = useId()
  const nominal = pipe.passport.nominal_wall_mm
  const [low, high] = trackDomain(profile.rows, kind, nominal, date)
  const height = kind === "priority" ? 32 : 100
  const x = (m: number) => ((m - range.from) / (range.to - range.from)) * 1000
  const y = (v: number) => height - 8 - ((v - low) / (high - low)) * (height - 16)
  const rows = profile.rows.filter((r) => r.end_m > range.from && r.start_m < range.to)
  const selectedValue = trackValue(row, kind, date, nominal)
  const hasValues = rows.some((r) => trackValue(r, kind, date, nominal) !== null)
  const selectedX = x((row.start_m + row.end_m) / 2)
  return (
    <section className={styles.track} data-track={kind} data-compact={props.compact || undefined}>
      <header className={styles.header}>
        <strong>{t(`variants:tracks.${kind}` as "variants:tracks.forecast")}</strong>
        <TrackCaption kind={kind} date={date} target={pipe.target_date} />
        <SelectedReading {...props} value={selectedValue} />
      </header>
      <div
        className={styles.plot}
        role="slider"
        tabIndex={0}
        aria-label={t(`variants:tracks.${kind}` as "variants:tracks.forecast")}
        aria-valuemin={profile.rows[0]?.segment_id ?? 0}
        aria-valuemax={profile.rows.at(-1)?.segment_id ?? 0}
        aria-valuenow={row.segment_id}
        aria-valuetext={t("variants:segmentValue", {
          id: row.segment_id,
          value: format.number(row.forecast_mm, 2),
        })}
        onKeyDown={input.keyboard}
      >
        {kind !== "priority" ? (
          <div className={styles.ticks} aria-hidden="true">
            {[0.25, 0.5, 0.75].map((part) => (
              <span
                key={part}
                style={
                  {
                    "--tick-position": `${((8 + (height - 16) * part) / height) * 100}%`,
                  } as CSSProperties
                }
              >
                {format.number(high - (high - low) * part, 1)}
              </span>
            ))}
          </div>
        ) : null}
        <svg
          className={styles.canvas}
          viewBox={`0 0 1000 ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          {...input.handlers}
        >
          <defs>
            <clipPath id={id}>
              <rect width={(split ?? 1) * 1000} height={height} />
            </clipPath>
          </defs>
          {[0.25, 0.5, 0.75].map((part) => (
            <line
              key={part}
              x1={0}
              x2={1000}
              y1={8 + (height - 16) * part}
              y2={8 + (height - 16) * part}
              className={styles.grid}
            />
          ))}
          {kind === "delta" ? (
            <line x1={0} x2={1000} y1={y(0)} y2={y(0)} className={styles.zero} />
          ) : null}
          {rows
            .filter((item) => props.highlights?.includes(item.segment_id))
            .map((item) => (
              <rect
                key={item.segment_id}
                x={x(item.start_m)}
                width={x(item.end_m) - x(item.start_m)}
                height={height}
                className={styles.selection}
                data-highlight={item.segment_id}
              />
            ))}
          <TrackMarks
            rows={rows}
            kind={kind}
            date={date}
            nominal={nominal}
            x={x}
            y={y}
            clip={split === undefined ? undefined : `url(#${id})`}
            overlay={overlay}
          />
          {input.hover === null ? null : (
            <line
              x1={input.hover * 1000}
              x2={input.hover * 1000}
              y1={0}
              y2={height}
              className={styles.hover}
            />
          )}
          {selectedX >= 0 && selectedX <= 1000 ? (
            <line x1={selectedX} x2={selectedX} y1={0} y2={height} className={styles.selected} />
          ) : null}
          {input.drag ? (
            <rect
              x={Math.min(...input.drag) * 1000}
              width={Math.abs(input.drag[1] - input.drag[0]) * 1000}
              height={height}
              className={styles.selection}
            />
          ) : null}
          {split === undefined ? null : (
            <line
              x1={split * 1000}
              x2={split * 1000}
              y1={0}
              y2={height}
              className={styles.selected}
            />
          )}
        </svg>
        {!hasValues ? <p className={styles.missing}>{t("variants:noTrack")}</p> : null}
      </div>
      <TrackAxis range={range} kind={kind} low={low} high={high} />
    </section>
  )
}

function TrackCaption({
  kind,
  date,
  target,
}: {
  readonly kind: TrackProps["kind"]
  readonly date: string | undefined
  readonly target: string
}) {
  const { t } = useTranslation()
  const format = useFormatters()
  if (kind === "observed")
    return (
      <span>
        {date ? t("variants:vtdDate", { date: format.date(date) }) : t("variants:nominalBase")}
      </span>
    )
  return (
    <span>
      {kind === "forecast"
        ? format.date(target)
        : t(`variants:units.${kind}` as "variants:units.forecast")}
    </span>
  )
}

function SelectedReading({ kind, row, value }: TrackProps & { readonly value: number | null }) {
  const { t } = useTranslation()
  const format = useFormatters()
  if (kind !== "observed" && kind !== "delta") return null
  const prefix = value !== null && value > 0 && kind === "delta" ? "+" : ""
  const reading = value === null ? t("variants:missing") : `${prefix}${format.number(value, 2)}`
  return (
    <span className={styles.reading}>
      {t("variants:trackReading", {
        segment: row.segment_id,
        value: reading,
        unit: t("pipe:unit.mmShort"),
      })}
    </span>
  )
}

function TrackAxis({
  range,
  kind,
  low,
  high,
}: Pick<TrackProps, "range" | "kind"> & { readonly low: number; readonly high: number }) {
  const { t } = useTranslation()
  const format = useFormatters()
  return (
    <footer className={styles.axis}>
      <span>
        {format.integer(range.from)} {t("variants:meter")}
      </span>
      <span>
        {kind === "priority"
          ? t("variants:priorityRule")
          : t("variants:axisRange", {
              from: format.number(low, 1),
              to: format.number(high, 1),
              unit: t(kind === "elevation" ? "variants:meter" : "pipe:unit.mmShort"),
            })}
      </span>
      <span>
        {format.integer(range.to)} {t("variants:meter")}
      </span>
    </footer>
  )
}
