import { clsx } from "clsx"
import { type KeyboardEvent, type ReactNode, useId, useRef } from "react"
import { useFormatters } from "../../../i18n"
import { useInputModality, useSlidingIndicator } from "../../../motion"
import { Icon, type IconName } from "../../primitives/icon/icon"
import styles from "./tabs.module.css"

export interface TabItem<T extends string> {
  readonly value: T
  readonly label: string
  readonly icon?: IconName | undefined
  readonly count?: number | undefined
  readonly alarm?: boolean | undefined
  readonly disabled?: boolean | undefined
}

export interface TabsProps<T extends string> {
  readonly label: string
  readonly items: readonly TabItem<T>[]
  readonly value: T
  readonly onChange: (value: T) => void
  readonly className?: string | undefined
  readonly children?: ReactNode
}

function nextIndex(key: string, current: number, length: number): number | null {
  if (key === "ArrowRight") return (current + 1) % length
  if (key === "ArrowLeft") return (current - 1 + length) % length
  if (key === "Home") return 0
  if (key === "End") return length - 1
  return null
}

export function Tabs<T extends string>({
  label,
  items,
  value,
  onChange,
  className,
  children,
}: TabsProps<T>) {
  const base = useId()
  const { integer } = useFormatters()
  const modality = useInputModality()
  const buttons = useRef(new Map<T, HTMLButtonElement>())
  const { listRef, indicatorRef, itemRef } = useSlidingIndicator<HTMLDivElement>(value, {
    instant: modality.instant,
    radiusToken: "--radius-none",
  })
  const enabled = items.filter((item) => item.disabled !== true)
  const tabId = (item: T) => `${base}-tab-${item}`

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    modality.onKeyDown()
    const current = enabled.findIndex((item) => item.value === value)
    const next = nextIndex(event.key, Math.max(0, current), enabled.length)
    const target = next === null ? undefined : enabled[next]
    if (target === undefined) return
    event.preventDefault()
    onChange(target.value)
    buttons.current.get(target.value)?.focus()
  }

  return (
    <div className={clsx(styles.tabs, className)}>
      <div className={styles.scroller}>
        <div
          ref={listRef}
          role="tablist"
          aria-label={label}
          className={styles.list}
          onKeyDown={onKeyDown}
          onPointerDown={modality.onPointerDown}
        >
          {items.map((item) => {
            const selected = item.value === value
            return (
              <button
                key={item.value}
                ref={(element) => {
                  itemRef(item.value)(element)
                  if (element === null) buttons.current.delete(item.value)
                  else buttons.current.set(item.value, element)
                }}
                id={tabId(item.value)}
                type="button"
                role="tab"
                className={styles.tab}
                aria-selected={selected}
                aria-controls={children === undefined ? undefined : `${base}-panel`}
                aria-disabled={item.disabled === true || undefined}
                tabIndex={selected ? 0 : -1}
                onClick={() => {
                  if (item.disabled !== true) onChange(item.value)
                }}
              >
                {item.icon === undefined ? null : <Icon name={item.icon} size="sm" />}
                <span>{item.label}</span>
                {item.count === undefined ? null : (
                  <span className={styles.count} data-alarm={item.alarm === true || undefined}>
                    {integer(item.count)}
                  </span>
                )}
              </button>
            )
          })}
          <span ref={indicatorRef} className={styles.ink} aria-hidden="true" />
        </div>
      </div>
      {children === undefined ? null : (
        <div
          id={`${base}-panel`}
          role="tabpanel"
          aria-labelledby={tabId(value)}
          className={styles.panel}
        >
          {children}
        </div>
      )}
    </div>
  )
}
