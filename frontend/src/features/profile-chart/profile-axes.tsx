import { useFormatters, useTranslation } from "@/shared/i18n"
import { type ChartBox, niceTicks, type Scale } from "./chart-scale"
import styles from "./profile-chart.module.css"

export interface ProfileAxesProps {
  readonly box: ChartBox
  readonly x: Scale
  readonly y: Scale
  readonly nominal: number
  readonly reject: number | null
}

const METERS_PER_KM = 1000

export function ProfileAxes({ box, x, y, nominal, reject }: ProfileAxesProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const yTicks = niceTicks(y.domain[0], y.domain[1], 5)
  const span = x.domain[1] - x.domain[0]
  const inKm = span > 3 * METERS_PER_KM
  const xTicks = niceTicks(x.domain[0], x.domain[1], Math.max(2, Math.floor(box.width / 110)))
  const xLabel = (value: number) =>
    inKm
      ? t("pipe:unit.km", { value: format.number(value / METERS_PER_KM, 1) })
      : t("pipe:unit.m", { value: format.integer(value) })
  const references = [
    {
      key: "nominal",
      value: nominal,
      label: t("profile:nominal", { value: format.number(nominal, 2) }),
    },
    ...(reject === null
      ? []
      : [
          {
            key: "reject",
            value: reject,
            label: t("profile:reject", { value: format.number(reject, 2) }),
          },
        ]),
  ]
  return (
    <g>
      {yTicks.map((tick) => (
        <g key={`y-${tick}`}>
          <line
            className={styles.grid}
            x1={box.left}
            x2={box.right}
            y1={y.at(tick)}
            y2={y.at(tick)}
          />
          <text
            className={styles.tick}
            x={box.left - 6}
            y={y.at(tick)}
            textAnchor="end"
            dy="0.32em"
          >
            {format.number(tick, 1)}
          </text>
        </g>
      ))}
      {xTicks.map((tick) => (
        <text
          key={`x-${tick}`}
          className={styles.tick}
          x={x.at(tick)}
          y={box.bottom + 18}
          textAnchor="middle"
        >
          {xLabel(tick)}
        </text>
      ))}
      <line className={styles.axis} x1={box.left} x2={box.right} y1={box.bottom} y2={box.bottom} />
      {references.map((item) => (
        <g key={item.key}>
          <line
            className={item.key === "nominal" ? styles.nominal : styles.reject}
            x1={box.left}
            x2={box.right}
            y1={y.at(item.value)}
            y2={y.at(item.value)}
          />
          <text
            className={styles.reference}
            x={box.right}
            y={y.at(item.value) - 5}
            textAnchor="end"
          >
            {item.label}
          </text>
        </g>
      ))}
      <text className={styles.unitLabel} x={box.left - 6} y={box.top - 4} textAnchor="end">
        {t("profile:axisMm")}
      </text>
    </g>
  )
}
