import { clsx } from "clsx"
import type { ReactNode } from "react"
import { useTranslation } from "../../../i18n"
import { Icon } from "../../primitives/icon/icon"
import styles from "./field.module.css"

export type FieldState = "default" | "error" | "warning" | "disabled" | "readonly"

export interface FieldMessage {
  readonly text: string
  readonly tone: "hint" | "error" | "warning"
}

export interface FieldIds {
  readonly control: string
  readonly label: string
  readonly message: string
}

export function fieldIds(base: string): FieldIds {
  return { control: `${base}-control`, label: `${base}-label`, message: `${base}-message` }
}

export interface FieldMessageInput {
  readonly hint?: string | undefined
  readonly error?: string | undefined
  readonly warning?: string | undefined
}

export function fieldMessage({ hint, error, warning }: FieldMessageInput): FieldMessage | null {
  if (error !== undefined) return { text: error, tone: "error" }
  if (warning !== undefined) return { text: warning, tone: "warning" }
  return hint === undefined ? null : { text: hint, tone: "hint" }
}

export interface FieldStateInput {
  readonly message: FieldMessage | null
  readonly disabled?: boolean | undefined
  readonly readOnly?: boolean | undefined
}

export function fieldState({ message, disabled, readOnly }: FieldStateInput): FieldState {
  if (disabled === true) return "disabled"
  if (message?.tone === "error") return "error"
  if (message?.tone === "warning") return "warning"
  return readOnly === true ? "readonly" : "default"
}

export interface FieldProps {
  readonly ids: FieldIds
  readonly label: string
  readonly labelFor?: boolean
  readonly optional?: boolean | undefined
  readonly aside?: ReactNode
  readonly message: FieldMessage | null
  readonly state: FieldState
  readonly className?: string | undefined
  readonly children: ReactNode
}

export function Field({
  ids,
  label,
  labelFor = true,
  optional = false,
  aside,
  message,
  state,
  className,
  children,
}: FieldProps) {
  const { t } = useTranslation()
  return (
    <div className={clsx(styles.field, className)} data-state={state}>
      <div className={styles.top}>
        {labelFor ? (
          <label id={ids.label} htmlFor={ids.control} className={styles.label}>
            {label}
          </label>
        ) : (
          <span id={ids.label} className={styles.label}>
            {label}
          </span>
        )}
        {optional ? <span className={styles.aside}>{t("common:field.optional")}</span> : null}
        {aside === undefined ? null : <span className={styles.aside}>{aside}</span>}
      </div>
      {children}
      {message === null ? null : (
        <p id={ids.message} className={styles.message}>
          {message.tone === "hint" ? null : (
            <Icon name={message.tone === "error" ? "error" : "warning"} size="sm" />
          )}
          <span>{message.text}</span>
        </p>
      )}
    </div>
  )
}
