import { type CSSProperties, useId } from "react"
import styles from "./range-field.module.css"

export interface RangeFieldProps {
  readonly label: string
  readonly value: number
  readonly min: number
  readonly max: number
  readonly onChange: (value: number) => void
}
export function RangeField({ label, value, min, max, onChange }: RangeFieldProps) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div
        className={styles.track}
        style={{ "--range-progress": (value - min) / (max - min) } as CSSProperties}
      >
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className={styles.thumb} aria-hidden="true" />
      </div>
    </div>
  )
}
