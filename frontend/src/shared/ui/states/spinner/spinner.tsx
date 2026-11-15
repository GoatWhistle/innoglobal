import { clsx } from "clsx"
import { useReducedMotion } from "../../../motion"
import styles from "./spinner.module.css"

export type SpinnerSize = "sm" | "control" | "lg"

export interface SpinnerProps {
  readonly label?: string | undefined
  readonly size?: SpinnerSize
  readonly className?: string | undefined
}

const SIZE_CLASS: Readonly<Record<SpinnerSize, string | undefined>> = {
  sm: undefined,
  control: styles.control,
  lg: styles.lg,
}

export function Spinner({ label, size = "sm", className }: SpinnerProps) {
  const reduced = useReducedMotion()
  const ring = <span className={clsx(styles.ring, SIZE_CLASS[size])} aria-hidden="true" />
  if (label === undefined) return <span className={clsx(styles.bare, className)}>{ring}</span>
  return (
    <span className={clsx(styles.spinner, className)} role="status">
      {ring}
      <span className={reduced ? styles.label : "visually-hidden"}>{label}</span>
    </span>
  )
}
