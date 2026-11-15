import { Button } from "@/shared/ui"
import { countryView, outlines, type Point } from "./map-geometry"
import styles from "./pipeline-map.module.css"

const OUTLINE = outlines
  .flatMap((polygon) =>
    polygon.map((ring) => `M${ring.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}Z`),
  )
  .join("")

const BOX = `${countryView.x} ${countryView.y} ${countryView.width} ${countryView.height}`

export interface MapLocatorProps {
  readonly focus: Point
  readonly label: string
  readonly onClick: () => void
}

export function MapLocator({ focus, label, onClick }: MapLocatorProps) {
  return (
    <Button
      variant="quiet"
      className={styles.locator}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <svg viewBox={BOX} aria-hidden="true">
        <path className={styles.locatorLand} d={OUTLINE} />
        <circle className={styles.locatorHalo} cx={focus[0]} cy={focus[1]} r="3.2" />
        <circle className={styles.locatorDot} cx={focus[0]} cy={focus[1]} r="1.1" />
      </svg>
    </Button>
  )
}
