import { clsx } from "clsx"
import type { ReactNode } from "react"
import { CloseButton } from "../../primitives/close-button/close-button"
import { Icon, type IconName } from "../../primitives/icon/icon"
import styles from "./banner.module.css"

export type BannerTone = "info" | "warning" | "danger" | "system"

export const BANNER_ICON: Readonly<Record<BannerTone, IconName>> = {
  info: "info",
  warning: "warning",
  danger: "alarm",
  system: "offline",
}

export interface BannerProps {
  readonly tone: BannerTone
  readonly title: string
  readonly children?: ReactNode
  readonly icon?: IconName | undefined
  readonly actions?: ReactNode
  readonly onDismiss?: (() => void) | undefined
  readonly dismissLabel?: string | undefined
  readonly edgeToEdge?: boolean
  readonly className?: string | undefined
}

export function Banner({
  tone,
  title,
  children,
  icon,
  actions,
  onDismiss,
  dismissLabel,
  edgeToEdge = false,
  className,
}: BannerProps) {
  const hasActions = actions !== undefined || onDismiss !== undefined
  return (
    <div
      className={clsx(styles.banner, edgeToEdge && styles.edge, className)}
      data-tone={tone}
      role={tone === "danger" ? "alert" : "status"}
      data-motion="fade"
    >
      <Icon name={icon ?? BANNER_ICON[tone]} size="md" className={styles.icon} />
      <p className={styles.text}>
        <b className={styles.title}>{title}</b> {children}
      </p>
      {hasActions ? (
        <div className={styles.actions}>
          {actions}
          {onDismiss === undefined ? null : (
            <CloseButton
              size="compact"
              label={dismissLabel}
              onClick={onDismiss}
              className={styles.close}
            />
          )}
        </div>
      ) : null}
    </div>
  )
}
