import { type ChangeEvent, type KeyboardEvent, useState } from "react"
import { useFormatters } from "../../../i18n"
import { type NumberBounds, parseNumber, snapNumber, stepNumber } from "./number-value"

export interface NumberDraftInput {
  readonly value: number | null
  readonly onChange: (value: number | null) => void
  readonly bounds: NumberBounds
  readonly largeStep: number
  readonly digits: number
}

export interface NumberDraft {
  readonly text: string
  readonly invalid: boolean
  readonly current: number | null
  readonly onInput: (event: ChangeEvent<HTMLInputElement>) => void
  readonly onBlur: () => void
  readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  readonly step: (direction: 1 | -1, large?: boolean) => void
}

function keyDelta(event: KeyboardEvent<HTMLInputElement>, step: number, large: number) {
  if (event.key === "ArrowUp") return event.shiftKey ? large : step
  if (event.key === "ArrowDown") return event.shiftKey ? -large : -step
  if (event.key === "PageUp") return large
  if (event.key === "PageDown") return -large
  return null
}

export function useNumberDraft({
  value,
  onChange,
  bounds,
  largeStep,
  digits,
}: NumberDraftInput): NumberDraft {
  const { number } = useFormatters()
  const [draft, setDraft] = useState<string | null>(null)
  const parsed = draft === null ? value : parseNumber(draft)
  const current = parsed === "invalid" ? value : parsed

  const commit = (next: number | null) => {
    setDraft(null)
    const snapped = next === null ? null : snapNumber(next, bounds, digits)
    if (snapped !== value) onChange(snapped)
  }

  const step = (direction: 1 | -1, large = false) =>
    commit(stepNumber(current, direction * (large ? largeStep : bounds.step), bounds, digits))

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const delta = keyDelta(event, bounds.step, largeStep)
    if (delta !== null) {
      event.preventDefault()
      commit(stepNumber(current, delta, bounds, digits))
      return
    }
    if (event.key === "Home" && bounds.min !== undefined) commit(bounds.min)
    else if (event.key === "End" && bounds.max !== undefined) commit(bounds.max)
    else if (event.key === "Enter" && draft !== null && parsed !== "invalid") commit(parsed)
  }

  const onBlur = () => {
    if (draft === null) return
    if (parsed === "invalid") setDraft(null)
    else commit(parsed)
  }

  return {
    text: draft ?? (value === null ? "" : number(value, digits)),
    invalid: parsed === "invalid",
    current,
    onInput: (event) => setDraft(event.target.value),
    onBlur,
    onKeyDown,
    step,
  }
}
