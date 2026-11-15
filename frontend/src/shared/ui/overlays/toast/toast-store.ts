import type { IconName } from "../../primitives/icon/icon"

export type ToastTone = "neutral" | "warning" | "danger"

export interface ToastAction {
  readonly label: string
  readonly icon?: IconName | undefined
  readonly onClick: () => void
}

export interface ToastInput {
  readonly tone?: ToastTone | undefined
  readonly icon?: IconName | undefined
  readonly title: string
  readonly text?: string | undefined
  readonly action?: ToastAction | undefined
}

export interface ToastEntry extends ToastInput {
  readonly id: number
  readonly leaving: boolean
}

export const TOAST_LIMIT = 3

export const TOAST_ICON: Readonly<Record<ToastTone, IconName>> = {
  neutral: "info",
  warning: "warning",
  danger: "alarm",
}

export function addToast(
  entries: readonly ToastEntry[],
  input: ToastInput,
  id: number,
): ToastEntry[] {
  const next = [...entries, { ...input, id, leaving: false }]
  const live = next.filter((entry) => !entry.leaving)
  const overflow = live.length - TOAST_LIMIT
  if (overflow <= 0) return next
  const evicted = new Set(live.slice(0, overflow).map((entry) => entry.id))
  return next.map((entry) => (evicted.has(entry.id) ? { ...entry, leaving: true } : entry))
}

export function leaveToast(entries: readonly ToastEntry[], id: number): ToastEntry[] {
  return entries.map((entry) => (entry.id === id ? { ...entry, leaving: true } : entry))
}

export function removeToast(entries: readonly ToastEntry[], id: number): ToastEntry[] {
  return entries.filter((entry) => entry.id !== id)
}
