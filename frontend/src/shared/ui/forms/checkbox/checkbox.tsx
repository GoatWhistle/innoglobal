import { clsx } from "clsx"
import { type ChangeEvent, useEffect, useRef } from "react"
import styles from "./checkbox.module.css"

export interface CheckboxProps {
  readonly label: string
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
  readonly indeterminate?: boolean
  readonly description?: string | undefined
  readonly invalid?: boolean
  readonly disabled?: boolean
  readonly hideLabel?: boolean
  readonly name?: string | undefined
  readonly value?: string | undefined
  readonly className?: string | undefined
}

export function Checkbox({
  label,
  checked,
  onChange,
  indeterminate = false,
  description,
  invalid = false,
  disabled = false,
  hideLabel = false,
  name,
  value,
  className,
}: CheckboxProps) {
  const input = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (input.current !== null) input.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <label className={clsx(styles.check, className)} data-invalid={invalid || undefined}>
      <input
        ref={input}
        className={styles.input}
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)}
      />
      <span className={styles.box} aria-hidden="true">
        <svg className={styles.mark} viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path className={styles.tick} d="M5 12.5l4.5 4.5L19 7.5" />
          <path className={styles.dash} d="M5.5 12h13" />
        </svg>
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
