import { clsx } from "clsx"
import type { FieldState } from "./field"
import styles from "./input-box.module.css"

export function inputBoxClassName(className?: string): string {
  return clsx(styles.box, className)
}

export const INPUT_UNIT_CLASS = styles.unit

export const INPUT_CONTROL_CLASS = styles.control

export function inputBoxState(state: FieldState): FieldState | undefined {
  return state === "default" ? undefined : state
}
