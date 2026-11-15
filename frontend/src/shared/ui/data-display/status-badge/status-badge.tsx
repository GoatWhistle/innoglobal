import { clsx } from "clsx"
import { Icon, type IconName } from "../../primitives/icon/icon"
import { Spinner } from "../../states/spinner/spinner"
import styles from "./status-badge.module.css"

export type StatusTone = "normal" | "warning" | "danger" | "muted" | "off" | "pending"
export type StatusBadgeSize = "regular" | "compact"

export const STATUS_ICON: Readonly<Record<StatusTone, IconName | null>> = {
  normal: "check",
  warning: "warning",
  danger: "alarm",
  muted: "sensor-off",
  off: "shut",
  pending: null,
}

const SIZE_CLASS: Readonly<Record<StatusBadgeSize, string | undefined>> = {
  regular: undefined,
  compact: styles.compact,
}

export interface StatusBadgeProps {
  readonly tone: StatusTone
  readonly label: string
  readonly icon?: IconName | undefined
  readonly size?: StatusBadgeSize
  readonly live?: boolean
  readonly className?: string | undefined
}

export function StatusBadge({
  tone,
  label,
  icon,
  size = "regular",
  live = false,
  className,
}: StatusBadgeProps) {
  const glyph = icon ?? STATUS_ICON[tone]
  return (
    <span
      className={clsx(styles.badge, SIZE_CLASS[size], className)}
      data-tone={tone}
      role={live ? "status" : undefined}
    >
      {glyph === null ? (
        <Spinner className={styles.spinner} />
      ) : (
        <Icon name={glyph} size="sm" className={styles.icon} />
      )}
      <span className={styles.label}>{label}</span>
    </span>
  )
}
