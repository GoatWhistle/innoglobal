import {
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react"
import { motionMs } from "../../../motion"
import { isTypeaheadKey, rovingIndex, typeaheadIndex } from "./listbox-keys"

export interface ListboxItem<T extends string> {
  readonly value: T
  readonly label: string
  readonly disabled?: boolean | undefined
}

export interface ListboxInput<T extends string> {
  readonly items: readonly ListboxItem<T>[]
  readonly value: T | null
  readonly onChoose: (value: T) => void
  readonly trigger: RefObject<HTMLElement | null>
  readonly list: RefObject<HTMLElement | null>
}

export interface Listbox<T extends string> {
  readonly open: boolean
  readonly active: T | null
  readonly toggle: () => void
  readonly onTriggerKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  readonly onListKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  readonly onListClick: (event: MouseEvent<HTMLElement>) => void
  readonly onListPointerMove: (event: MouseEvent<HTMLElement>) => void
}

const OPEN_KEYS = new Set(["ArrowDown", "ArrowUp", "Enter", " "])
const CHOOSE_KEYS = new Set(["Enter", " "])

function optionValue(event: MouseEvent<HTMLElement>): string | null {
  const option = (event.target as Element).closest<HTMLElement>('[role="option"]')
  if (option === null || option.getAttribute("aria-disabled") === "true") return null
  return option.dataset.value ?? null
}

export function useListbox<T extends string>({
  items,
  value,
  onChoose,
  trigger,
  list,
}: ListboxInput<T>): Listbox<T> {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<T | null>(null)
  const query = useRef({ text: "", at: 0 })
  const enabled = items.filter((item) => item.disabled !== true)
  const find = (raw: string | null) => enabled.find((item) => item.value === raw)

  const show = () => {
    setActive(find(value)?.value ?? enabled[0]?.value ?? null)
    setOpen(true)
  }

  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) trigger.current?.focus({ preventScroll: true })
  }

  const choose = (next: T) => {
    if (next !== value) onChoose(next)
    close(true)
  }

  useEffect(() => {
    if (!open) return
    list.current?.focus({ preventScroll: true })
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (list.current?.contains(target) || trigger.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open, list, trigger])

  const seek = (key: string, current: number) => {
    const now = performance.now()
    const span = motionMs("--window-tooltip-skip")
    const text = now - query.current.at < span ? query.current.text + key : key
    query.current = { text, at: now }
    return typeaheadIndex(
      text,
      enabled.map((item) => item.label),
      current,
    )
  }

  const moveTo = (key: string): boolean => {
    const current = enabled.findIndex((item) => item.value === active)
    const moved = rovingIndex(key, current, enabled.length)
    const next = moved ?? (isTypeaheadKey(key) ? seek(key, current) : null)
    const item = next === null ? undefined : enabled[next]
    if (item !== undefined) setActive(item.value)
    return next !== null
  }

  const onListKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Tab") {
      close(false)
      return
    }
    const handled = moveTo(event.key) || CHOOSE_KEYS.has(event.key) || event.key === "Escape"
    if (!handled) return
    event.preventDefault()
    if (event.key === "Escape") close(true)
    else if (CHOOSE_KEYS.has(event.key) && active !== null) choose(active)
  }

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!OPEN_KEYS.has(event.key)) return
    event.preventDefault()
    show()
  }

  return {
    open,
    active,
    toggle: () => (open ? close(false) : show()),
    onTriggerKeyDown,
    onListKeyDown,
    onListClick: (event) => {
      const item = find(optionValue(event))
      if (item !== undefined) choose(item.value)
    },
    onListPointerMove: (event) => {
      const item = find(optionValue(event))
      if (item !== undefined && item.value !== active) setActive(item.value)
    },
  }
}
