import {
  type FocusEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { motionMs } from "../../../motion"

let lastHiddenAt = Number.NEGATIVE_INFINITY

export interface TooltipTriggerProps {
  readonly onPointerEnter: (event: PointerEvent<HTMLElement>) => void
  readonly onPointerLeave: () => void
  readonly onPointerDown: () => void
  readonly onFocus: (event: FocusEvent<HTMLElement>) => void
  readonly onBlur: () => void
}

export interface TooltipState<T extends HTMLElement> {
  readonly id: string
  readonly anchorRef: RefObject<T | null>
  readonly open: boolean
  readonly instant: boolean
  readonly triggerProps: TooltipTriggerProps
}

function recentlyHidden(): boolean {
  return performance.now() - lastHiddenAt < motionMs("--window-tooltip-skip")
}

export function useTooltip<T extends HTMLElement = HTMLElement>(): TooltipState<T> {
  const id = useId()
  const anchorRef = useRef<T | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [instant, setInstant] = useState(false)

  const show = useCallback((now: boolean) => {
    window.clearTimeout(timer.current)
    setInstant(now)
    setOpen(true)
  }, [])

  const hide = useCallback(() => {
    window.clearTimeout(timer.current)
    setOpen((current) => {
      if (current) lastHiddenAt = performance.now()
      return false
    })
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide()
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("scroll", hide, true)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("scroll", hide, true)
    }
  }, [open, hide])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onPointerEnter = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "touch") return
      if (recentlyHidden()) {
        show(true)
        return
      }
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => show(false), motionMs("--delay-tooltip"))
    },
    [show],
  )

  const onFocus = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      if (event.currentTarget.matches(":focus-visible")) show(true)
    },
    [show],
  )

  return {
    id,
    anchorRef,
    open,
    instant,
    triggerProps: {
      onPointerEnter,
      onPointerLeave: hide,
      onPointerDown: hide,
      onFocus,
      onBlur: hide,
    },
  }
}
