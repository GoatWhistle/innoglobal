import { BrandMark } from "../../brand/brand-mark/brand-mark"
import styles from "./loading-scene.module.css"

export interface LoadingSceneProps {
  readonly label: string
}

export function LoadingScene({ label }: LoadingSceneProps) {
  return (
    <div className={styles.scene} role="status">
      <BrandMark variant="symbol" size="lg" state="busy" />
      <p className={styles.label}>{label}</p>
    </div>
  )
}
