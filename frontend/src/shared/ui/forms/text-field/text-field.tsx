import type { InputHTMLAttributes, Ref } from "react"
import { useId } from "react"
import { Icon, type IconName } from "../../primitives/icon/icon"
import { Field, fieldIds, fieldMessage, fieldState } from "../field/field"
import {
  INPUT_CONTROL_CLASS,
  INPUT_UNIT_CLASS,
  inputBoxClassName,
  inputBoxState,
} from "../field/input-box"

export type TextFieldType = "text" | "email" | "password" | "search" | "tel" | "url"

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id" | "size" | "children"> {
  readonly label: string
  readonly type?: TextFieldType
  readonly hint?: string | undefined
  readonly error?: string | undefined
  readonly warning?: string | undefined
  readonly optional?: boolean | undefined
  readonly icon?: IconName | undefined
  readonly unit?: string | undefined
  readonly className?: string | undefined
  readonly ref?: Ref<HTMLInputElement> | undefined
}

export function TextField({
  label,
  type = "text",
  hint,
  error,
  warning,
  optional,
  icon,
  unit,
  className,
  disabled,
  readOnly,
  ...rest
}: TextFieldProps) {
  const ids = fieldIds(useId())
  const message = fieldMessage({ hint, error, warning })
  const state = fieldState({ message, disabled, readOnly })
  const prefix = icon ?? (readOnly === true ? "lock" : undefined)
  return (
    <Field
      ids={ids}
      label={label}
      optional={optional}
      message={message}
      state={state}
      className={className}
    >
      <div className={inputBoxClassName()} data-state={inputBoxState(state)}>
        {prefix === undefined ? null : <Icon name={prefix} size="sm" />}
        <input
          {...rest}
          id={ids.control}
          type={type}
          className={INPUT_CONTROL_CLASS}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={message === null ? undefined : ids.message}
        />
        {unit === undefined ? null : <span className={INPUT_UNIT_CLASS}>{unit}</span>}
      </div>
    </Field>
  )
}
