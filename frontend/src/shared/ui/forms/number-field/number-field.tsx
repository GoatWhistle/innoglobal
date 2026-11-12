import { clsx } from "clsx"
import { useId } from "react"
import { useTranslation } from "../../../i18n"
import { Icon } from "../../primitives/icon/icon"
import { Field, fieldIds, fieldMessage, fieldState } from "../field/field"
import {
  INPUT_CONTROL_CLASS,
  INPUT_UNIT_CLASS,
  inputBoxClassName,
  inputBoxState,
} from "../field/input-box"
import styles from "./number-field.module.css"
import { atBound, decimalsOf } from "./number-value"
import { useNumberDraft } from "./use-number-draft"

export interface NumberFieldProps {
  readonly label: string
  readonly value: number | null
  readonly onChange: (value: number | null) => void
  readonly min?: number | undefined
  readonly max?: number | undefined
  readonly step?: number
  readonly largeStep?: number | undefined
  readonly fractionDigits?: number | undefined
  readonly unit?: string | undefined
  readonly hint?: string | undefined
  readonly error?: string | undefined
  readonly warning?: string | undefined
  readonly optional?: boolean | undefined
  readonly disabled?: boolean | undefined
  readonly readOnly?: boolean | undefined
  readonly placeholder?: string | undefined
  readonly name?: string | undefined
  readonly className?: string | undefined
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  largeStep,
  fractionDigits,
  unit,
  hint,
  error,
  warning,
  optional,
  disabled,
  readOnly,
  placeholder,
  name,
  className,
}: NumberFieldProps) {
  const { t } = useTranslation()
  const ids = fieldIds(useId())
  const bounds = { min, max, step }
  const digits = fractionDigits ?? decimalsOf(step)
  const draft = useNumberDraft({
    value,
    onChange,
    bounds,
    largeStep: largeStep ?? step * 10,
    digits,
  })
  const message = fieldMessage({ hint, error, warning })
  const state = fieldState({ message, disabled, readOnly })
  const locked = disabled === true || readOnly === true
  const stepper = (direction: 1 | -1) => (
    <button
      type="button"
      tabIndex={-1}
      className={styles.step}
      aria-label={t(direction > 0 ? "common:field.increase" : "common:field.decrease")}
      disabled={locked || atBound(draft.current, bounds, direction)}
      onClick={(event) => draft.step(direction, event.shiftKey)}
    >
      <Icon name={direction > 0 ? "plus" : "minus"} size="sm" />
    </button>
  )
  return (
    <Field
      ids={ids}
      label={label}
      optional={optional}
      message={message}
      state={state}
      className={className}
    >
      <div className={inputBoxClassName(styles.box)} data-state={inputBoxState(state)}>
        {stepper(-1)}
        <input
          id={ids.control}
          name={name}
          className={clsx(INPUT_CONTROL_CLASS, styles.input)}
          inputMode="decimal"
          autoComplete="off"
          role="spinbutton"
          value={draft.text}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          aria-valuenow={draft.current ?? undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={
            unit === undefined || draft.text === ""
              ? undefined
              : t("common:field.valueWithUnit", { value: draft.text, unit })
          }
          aria-invalid={error !== undefined || draft.invalid ? true : undefined}
          aria-describedby={message === null ? undefined : ids.message}
          onChange={draft.onInput}
          onBlur={draft.onBlur}
          onKeyDown={readOnly === true ? undefined : draft.onKeyDown}
        />
        {unit === undefined ? null : (
          <span className={clsx(INPUT_UNIT_CLASS, styles.unit)}>{unit}</span>
        )}
        {stepper(1)}
      </div>
    </Field>
  )
}
