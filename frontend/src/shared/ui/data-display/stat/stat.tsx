import { clsx } from "clsx"
import type { ReactNode } from "react"
import styles from "./stat.module.css"

export type StatSize = "regular" | "large"

const SIZE_CLASS: Readonly<Record<StatSize, string | undefined>> = {
  regular: undefined,
  large: styles.large,
}

export interface StatProps {
  readonly label: ReactNode
  readonly value: ReactNode
  readonly unit?: ReactNode
  readonly hint?: ReactNode
  readonly size?: StatSize
  readonly className?: string | undefined
}

export function Stat({ label, value, unit, hint, size = "regular", className }: StatProps) {
  return (
    <div className={clsx(styles.stat, SIZE_CLASS[size], className)}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.body}>
        <span className={styles.value}>{value}</span>
        {unit === undefined ? null : <span className={styles.unit}>{unit}</span>}
      </dd>
      {hint === undefined ? null : <dd className={styles.hint}>{hint}</dd>}
    </div>
  )
}
