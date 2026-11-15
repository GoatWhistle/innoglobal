import { useTranslation } from "@/shared/i18n"
import { Button } from "@/shared/ui"
import { countryData as country } from "./data/country.gen"
import styles from "./map-sidebar.module.css"

const flat = (lon: number, lat: number) => [lon * 0.55, -lat] as const

const OUTLINE = country.regions
  .flatMap((region) =>
    region.p.map(
      (ring) =>
        `M${ring
          .map((p) => flat(p[0] ?? 0, p[1] ?? 0))
          .map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
          .join("L")}Z`,
    ),
  )
  .join("")

function regionNear(lon: number, lat: number): string {
  let best = Number.POSITIVE_INFINITY
  let name = ""
  for (const region of country.regions) {
    const [x, y] = region.c
    const distance = Math.hypot(((x ?? 0) - lon) * 0.55, (y ?? 0) - lat)
    if (distance < best) {
      best = distance
      name = region.n ?? ""
    }
  }
  return name
}

export interface MapFieldProps {
  readonly lon: number
  readonly lat: number
  readonly onCountry: () => void
}

export function MapField({ lon, lat, onCountry }: MapFieldProps) {
  const { t } = useTranslation()
  const [x, y] = flat(lon, lat)
  return (
    <section className={styles.block}>
      <p className={styles.caption}>{t("variants:workspace.mapField")}</p>
      <Button variant="quiet" className={styles.locator} onClick={onCountry}>
        <span className={styles.locatorBody}>
          <svg viewBox="9 -84 100 50" aria-hidden="true">
            <path className={styles.locatorLand} d={OUTLINE} />
            <circle className={styles.locatorHalo} cx={x} cy={y} r="3.2" />
            <circle className={styles.locatorDot} cx={x} cy={y} r="1.1" />
          </svg>
          <span className={styles.locatorText}>
            <strong>{regionNear(lon, lat)}</strong>
            <span>{t("variants:workspace.mapLocator")}</span>
          </span>
        </span>
      </Button>
      <ul className={styles.legend}>
        <li>
          <span className={styles.swatch} data-kind="product" aria-hidden="true" />
          {t("variants:workspace.mapLegendProduct")}
        </li>
        <li>
          <span className={styles.swatch} data-kind="network" aria-hidden="true" />
          {t("variants:workspace.mapLegendNetwork")}
        </li>
      </ul>
      <p className={styles.credit}>{t("variants:workspace.mapCredit")}</p>
    </section>
  )
}
