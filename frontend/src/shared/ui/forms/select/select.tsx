import { useId, useRef } from "react"
import { FloatingLayer } from "../../overlays/floating-layer/floating-layer"
import { Icon } from "../../primitives/icon/icon"
import { Field, fieldIds, fieldMessage, fieldState } from "../field/field"
import { inputBoxClassName, inputBoxState } from "../field/input-box"
import styles from "./select.module.css"
import { type SelectOption, SelectOptions } from "./select-options"
import { useListbox } from "./use-listbox"

export type { SelectOption } from "./select-options"

export interface SelectProps<T extends string> {
  readonly label: string
  readonly options: readonly SelectOption<T>[]
  readonly value: T | null
  readonly onChange: (value: T) => void
  readonly placeholder?: string | undefined
  readonly hint?: string | undefined
  readonly error?: string | undefined
  readonly warning?: string | undefined
  readonly optional?: boolean | undefined
  readonly disabled?: boolean | undefined
  readonly className?: string | undefined
}

export function Select<T extends string>({
  label,
  options,
  value,
  onChange,
  placeholder,
  hint,
  error,
  warning,
  optional,
  disabled,
  className,
}: SelectProps<T>) {
  const base = useId()
  const ids = fieldIds(base)
  const valueId = `${base}-value`
  const listId = `${base}-list`
  const trigger = useRef<HTMLButtonElement | null>(null)
  const list = useRef<HTMLDivElement | null>(null)
  const listbox = useListbox({ items: options, value, onChoose: onChange, trigger, list })
  const message = fieldMessage({ hint, error, warning })
  const state = fieldState({ message, disabled })
  const selected = options.find((option) => option.value === value)
  return (
    <Field
      ids={ids}
      label={label}
      labelFor={false}
      optional={optional}
      message={message}
      state={state}
      className={className}
    >
      <button
        ref={trigger}
        id={ids.control}
        type="button"
        className={inputBoxClassName(styles.trigger)}
        data-state={inputBoxState(state)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={listbox.open}
        aria-controls={listbox.open ? listId : undefined}
        aria-labelledby={`${ids.label} ${valueId}`}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={message === null ? undefined : ids.message}
        onClick={listbox.toggle}
        onKeyDown={listbox.onTriggerKeyDown}
      >
        <span
          id={valueId}
          className={styles.value}
          data-placeholder={selected === undefined || undefined}
        >
          {selected?.label ?? placeholder}
        </span>
        <Icon name="chevron-down" size="sm" className={styles.chevron} />
      </button>
      <FloatingLayer
        anchor={trigger}
        open={listbox.open}
        matchWidth
        layerRef={list}
        id={listId}
        role="listbox"
        tabIndex={-1}
        aria-labelledby={ids.label}
        aria-activedescendant={listbox.active === null ? undefined : `${listId}-${listbox.active}`}
        className={styles.layer}
        onKeyDown={listbox.onListKeyDown}
        onClick={listbox.onListClick}
        onPointerMove={listbox.onListPointerMove}
      >
        <SelectOptions idBase={listId} options={options} value={value} active={listbox.active} />
      </FloatingLayer>
    </Field>
  )
}
