import { Icon, type IconName } from "../../primitives/icon/icon"
import styles from "./select-options.module.css"

export interface SelectOption<T extends string> {
  readonly value: T
  readonly label: string
  readonly meta?: string | undefined
  readonly icon?: IconName | undefined
  readonly disabled?: boolean | undefined
}

export interface SelectOptionsProps<T extends string> {
  readonly idBase: string
  readonly options: readonly SelectOption<T>[]
  readonly value: T | null
  readonly active: T | null
}

function scrollIntoView(element: HTMLDivElement | null): void {
  element?.scrollIntoView?.({ block: "nearest" })
}

export function SelectOptions<T extends string>({
  idBase,
  options,
  value,
  active,
}: SelectOptionsProps<T>) {
  return options.map((option) => {
    const disabled = option.disabled === true
    const isActive = option.value === active
    return (
      <div
        key={option.value}
        ref={isActive ? scrollIntoView : undefined}
        id={`${idBase}-${option.value}`}
        role="option"
        tabIndex={-1}
        data-value={option.value}
        className={styles.option}
        aria-selected={option.value === value}
        aria-disabled={disabled || undefined}
        data-active={isActive || undefined}
      >
        <Icon name="check" size="sm" className={styles.check} />
        {option.icon === undefined ? null : <Icon name={option.icon} size="sm" />}
        <span className={styles.label}>{option.label}</span>
        {option.meta === undefined ? null : <span className={styles.meta}>{option.meta}</span>}
      </div>
    )
  })
}
