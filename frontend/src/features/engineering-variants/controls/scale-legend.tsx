import { useThickness, wallColor } from "@/entities/pipe"
import { useTranslation } from "@/shared/i18n"
import styles from "./scale-legend.module.css"

export function ScaleLegend({
  low,
  high,
  interval = false,
}: {
  readonly low: number
  readonly high: number
  readonly interval?: boolean
}) {
  const { t } = useTranslation()
  const thickness = useThickness()
  return (
    <div className={styles.legend}>
      <span>{t(interval ? "variants:intervalWidth" : "variants:fixedScale")}</span>
      <span className={styles.scale}>
        {Array.from({ length: 8 }, (_, i) => (
          <i key={wallColor(i)} style={{ backgroundColor: wallColor(interval ? i : 7 - i) }} />
        ))}
      </span>
      <span>{thickness.withUnit(low)}</span>
      <span>{thickness.withUnit(high)}</span>
    </div>
  )
}
