import { clsx } from "clsx"
import type { ReactNode } from "react"
import { Spinner } from "../../states/spinner/spinner"
import { Icon, type IconName } from "../icon/icon"
import styles from "./button.module.css"

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger"
export type ButtonSize = "regular" | "compact"

const VARIANT_CLASS: Readonly<Record<ButtonVariant, string | undefined>> = {
  primary: styles.primary,
  secondary: styles.secondary,
  quiet: styles.quiet,
  danger: styles.danger,
}

const SIZE_CLASS: Readonly<Record<ButtonSize, string | undefined>> = {
  regular: undefined,
  compact: styles.compact,
}

export interface ButtonLook {
  readonly variant: ButtonVariant
  readonly size: ButtonSize
  readonly icon: IconName | undefined
  readonly className?: string | undefined
}

export function buttonClassName({ variant, size, icon, className }: ButtonLook): string {
  return clsx(
    styles.button,
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    icon !== undefined && styles.withIcon,
    className,
  )
}

export interface ButtonContentProps {
  readonly icon?: IconName | undefined
  readonly pending?: boolean
  readonly children: ReactNode
}

function Lead({ icon, pending }: { readonly icon: IconName; readonly pending: boolean }) {
  return pending ? <Spinner size="control" /> : <Icon name={icon} size="control" />
}

export function ButtonContent({ icon, pending = false, children }: ButtonContentProps) {
  const overlay = pending && icon === undefined
  return (
    <>
      {icon === undefined ? null : <Lead icon={icon} pending={pending} />}
      <span className={styles.label} data-hidden={overlay || undefined}>
        {children}
      </span>
      {overlay ? <Spinner size="control" className={styles.overlay} /> : null}
    </>
  )
}
