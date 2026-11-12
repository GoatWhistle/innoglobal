import { clsx } from "clsx"
import type { ReactNode } from "react"
import styles from "./kbd.module.css"

export interface KbdProps {
  readonly className?: string | undefined
  readonly children: ReactNode
}

export function Kbd({ className, children }: KbdProps) {
  return <kbd className={clsx(styles.kbd, className)}>{children}</kbd>
}
