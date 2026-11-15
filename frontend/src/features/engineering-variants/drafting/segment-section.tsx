import { useThickness } from "@/entities/pipe"
import { useTranslation } from "@/shared/i18n"
import type { WorkspaceProps } from "../variant-types"
import styles from "./segment-section.module.css"

export function SegmentSection({ row, pipe }: Pick<WorkspaceProps, "row" | "pipe">) {
  const { t } = useTranslation()
  const thickness = useThickness()
  const nominal = pipe.passport.nominal_wall_mm
  const radius = (value: number) => 100 - (value * 36) / nominal
  const inner = radius(row.forecast_mm)
  return (
    <figure className={styles.figure}>
      <svg
        className={styles.drawing}
        viewBox="0 0 280 260"
        role="img"
        aria-label={t("section:label", {
          value: thickness.withUnit(row.forecast_mm),
          nominal: thickness.withUnit(nominal),
        })}
      >
        <circle cx={130} cy={120} r={100} className={styles.wall} />
        <circle cx={130} cy={120} r={inner} className={styles.bore} />
        <circle
          cx={130}
          cy={120}
          r={(radius(row.p10_mm) + radius(row.p90_mm)) / 2}
          className={styles.interval}
          strokeWidth={Math.abs(radius(row.p10_mm) - radius(row.p90_mm))}
        />
        <circle cx={130} cy={120} r={radius(nominal)} className={styles.nominal} />
        <circle cx={130} cy={120} r={radius(row.p10_mm)} className={styles.low} />
        <circle cx={130} cy={120} r={radius(row.p90_mm)} className={styles.high} />
        <path
          d={`M${130 + inner} 120v110m${230} -110v110M${130 + inner} 224H230`}
          className={styles.dimension}
        />
        <path d={`M${127 + inner} 221l6 6m94 -6l6 6`} className={styles.dimension} />
        <text x={230} y={248} textAnchor="end" className={styles.value}>
          {thickness.withUnit(row.forecast_mm)}
        </text>
        <text x={130} y={120} textAnchor="middle" className={styles.caption}>
          {t("pipe:restoration.scale")}
        </text>
      </svg>
      <figcaption className={styles.note}>{t("variants:sectionHint")}</figcaption>
      <dl className={styles.keys}>
        <div>
          <dt>
            <i className={styles.nominalKey} />
            {t("section:keyNominal")}
          </dt>
          <dd>{thickness.withUnit(nominal)}</dd>
        </div>
        <div>
          <dt>
            <i className={styles.lowKey} />
            {t("variants:p10")}
          </dt>
          <dd>{thickness.withUnit(row.p10_mm)}</dd>
        </div>
        <div>
          <dt>
            <i className={styles.highKey} />
            {t("variants:p90")}
          </dt>
          <dd>{thickness.withUnit(row.p90_mm)}</dd>
        </div>
      </dl>
    </figure>
  )
}
