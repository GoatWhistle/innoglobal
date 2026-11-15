import { clsx } from "clsx"
import type { CSSProperties, ReactNode } from "react"
import styles from "./bar-list.module.css"

export interface BarItem {
  readonly id: string
  readonly label: ReactNode
  readonly share: number
  readonly value: ReactNode
  readonly meta?: ReactNode
  readonly emphasis?: boolean
}

export interface BarListProps {
  readonly label: string
  readonly items: readonly BarItem[]
  readonly className?: string | undefined
}

export function BarList({ label, items, className }: BarListProps) {
  return (
    <ul className={clsx(styles.list, className)} aria-label={label}>
      {items.map((item) => (
        <li key={item.id} className={clsx(styles.item, item.emphasis && styles.emphasis)}>
          <span className={styles.label}>{item.label}</span>
          <span className={styles.value}>{item.value}</span>
          <span
            className={styles.track}
            aria-hidden="true"
            style={{ "--share": Math.max(0, Math.min(1, item.share)) } as CSSProperties}
          >
            <span className={styles.fill} />
          </span>
          {item.meta === undefined ? null : <span className={styles.meta}>{item.meta}</span>}
        </li>
      ))}
    </ul>
  )
}
