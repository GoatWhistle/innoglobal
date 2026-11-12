import { clsx } from "clsx"
import type { ReactNode } from "react"
import { Icon, type IconName } from "../../primitives/icon/icon"
import styles from "./state-panel.module.css"

export type StatePanelTone = "neutral" | "warning" | "danger"

export interface StatePanelProps {
  readonly icon: IconName
  readonly title: string
  readonly description?: ReactNode
  readonly meta?: ReactNode
  readonly actions?: ReactNode
  readonly tone?: StatePanelTone
  readonly role?: "alert" | "status" | undefined
  readonly className?: string | undefined
}

export function StatePanel({
  icon,
  title,
  description,
  meta,
  actions,
  tone = "neutral",
  role,
  className,
}: StatePanelProps) {
  return (
    <div className={clsx(styles.panel, className)} data-tone={tone} role={role} data-motion="fade">
      <Icon name={icon} size="xl" className={styles.icon} />
      <p className={styles.title}>{title}</p>
      {description === undefined ? null : <p className={styles.text}>{description}</p>}
      {meta === undefined ? null : <p className={styles.meta}>{meta}</p>}
      {actions === undefined ? null : <div className={styles.actions}>{actions}</div>}
    </div>
  )
}
