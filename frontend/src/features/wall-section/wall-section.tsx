import { useThickness } from "@/entities/pipe"
import { useFormatters, useTranslation } from "@/shared/i18n"
import styles from "./wall-section.module.css"

export interface WallSectionProps {
  readonly forecast: number
  readonly p10: number
  readonly nominal: number
  readonly diameter: number
}

const SIZE = 260
const CENTER = SIZE / 2
const OUTER = 104
const WALL = 30

export function WallSection({ forecast, p10, nominal, diameter }: WallSectionProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const thickness = useThickness()
  const scale = WALL / nominal
  const inner = OUTER - forecast * scale
  const lowInner = OUTER - p10 * scale
  const nominalInner = OUTER - WALL
  const exaggeration = WALL / OUTER / (nominal / (diameter / 2))
  const dimY = CENTER - (OUTER + inner) / 2
  return (
    <figure className={styles.figure}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={t("section:label", {
          value: thickness.withUnit(forecast),
          nominal: thickness.withUnit(nominal),
        })}
      >
        <circle className={styles.oil} cx={CENTER} cy={CENTER} r={inner} />
        <path
          className={styles.wall}
          fillRule="evenodd"
          d={`M${CENTER - OUTER} ${CENTER}a${OUTER} ${OUTER} 0 1 0 ${OUTER * 2} 0a${OUTER} ${OUTER} 0 1 0 ${-OUTER * 2} 0ZM${CENTER - inner} ${CENTER}a${inner} ${inner} 0 1 0 ${inner * 2} 0a${inner} ${inner} 0 1 0 ${-inner * 2} 0Z`}
        />
        <circle className={styles.nominal} cx={CENTER} cy={CENTER} r={nominalInner} />
        <circle className={styles.low} cx={CENTER} cy={CENTER} r={lowInner} />
        <line
          className={styles.dimension}
          x1={CENTER}
          x2={CENTER}
          y1={CENTER - OUTER}
          y2={CENTER - inner}
        />
        <line
          className={styles.tick}
          x1={CENTER - 6}
          x2={CENTER + 6}
          y1={CENTER - OUTER}
          y2={CENTER - OUTER}
        />
        <line
          className={styles.tick}
          x1={CENTER - 6}
          x2={CENTER + 6}
          y1={CENTER - inner}
          y2={CENTER - inner}
        />
        <text className={styles.value} x={CENTER + 10} y={dimY} dy="0.32em">
          {thickness.withUnit(forecast)}
        </text>
        <text className={styles.note} x={CENTER} y={CENTER} textAnchor="middle" dy="0.32em">
          {t("section:oil")}
        </text>
      </svg>
      <figcaption className={styles.caption}>
        {t("section:caption", { factor: format.number(exaggeration, 1) })}
      </figcaption>
      <ul className={styles.keys}>
        <li className={styles.key}>
          <span className={styles.keyWall} aria-hidden="true" />
          {t("section:keyForecast")}
        </li>
        <li className={styles.key}>
          <span className={styles.keyNominal} aria-hidden="true" />
          {t("section:keyNominal", { value: thickness.withUnit(nominal) })}
        </li>
        <li className={styles.key}>
          <span className={styles.keyLow} aria-hidden="true" />
          {t("section:keyLow", { value: thickness.withUnit(p10) })}
        </li>
      </ul>
    </figure>
  )
}
