import { clsx } from "clsx"
import type { ReactNode } from "react"
import styles from "./stat-grid.module.css"

export type StatGridLook = "plain" | "ruled"

const LOOK_CLASS: Readonly<Record<StatGridLook, string | undefined>> = {
  plain: undefined,
  ruled: styles.ruled,
}

export interface StatGridProps {
  readonly look?: StatGridLook
  readonly className?: string | undefined
  readonly children: ReactNode
}

export function StatGrid({ look = "plain", className, children }: StatGridProps) {
  return <dl className={clsx(styles.grid, LOOK_CLASS[look], className)}>{children}</dl>
}
