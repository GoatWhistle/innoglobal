import { clsx } from "clsx"
import type { ChangeEvent } from "react"
import styles from "./switch.module.css"

export interface SwitchProps {
  readonly label: string
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
  readonly description?: string | undefined
  readonly pending?: boolean
  readonly disabled?: boolean
  readonly hideLabel?: boolean
  readonly name?: string | undefined
  readonly className?: string | undefined
}

export function Switch({
  label,
  checked,
  onChange,
  description,
  pending = false,
  disabled = false,
  hideLabel = false,
  name,
  className,
}: SwitchProps) {
  return (
    <label className={clsx(styles.toggle, className)} aria-busy={pending || undefined}>
      <input
        className={styles.input}
        type="checkbox"
        role="switch"
        name={name}
        checked={checked}
        aria-checked={checked}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          if (!pending) onChange(event.target.checked)
        }}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      <span className={hideLabel ? "visually-hidden" : styles.text}>
        <span>{label}</span>
        {description === undefined ? null : (
          <small className={styles.description}>{description}</small>
        )}
      </span>
    </label>
  )
}
