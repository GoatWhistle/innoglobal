export interface NumberBounds {
  readonly min?: number | undefined
  readonly max?: number | undefined
  readonly step: number
}

export type ParsedNumber = number | null | "invalid"

const SPACES = /[\s  ]/g
const NUMBER_TEXT = /^[-−]?\d*(\.\d*)?$/

export function parseNumber(text: string): ParsedNumber {
  const normalized = text.replace(SPACES, "").replace(",", ".").replace("−", "-")
  if (normalized === "") return null
  if (!NUMBER_TEXT.test(normalized) || normalized === "-" || normalized === ".") return "invalid"
  const value = Number(normalized)
  return Number.isFinite(value) ? value : "invalid"
}

export function decimalsOf(step: number): number {
  const text = String(step)
  const dot = text.indexOf(".")
  return dot < 0 ? 0 : text.length - dot - 1
}

export function clampNumber(value: number, { min, max }: NumberBounds): number {
  const low = min ?? Number.NEGATIVE_INFINITY
  const high = max ?? Number.POSITIVE_INFINITY
  return Math.min(high, Math.max(low, value))
}

export function snapNumber(value: number, bounds: NumberBounds, digits: number): number {
  return Number(clampNumber(value, bounds).toFixed(digits))
}

export function stepNumber(
  value: number | null,
  delta: number,
  bounds: NumberBounds,
  digits: number,
): number {
  const start = value ?? bounds.min ?? 0
  return snapNumber(start + delta, bounds, digits)
}

export function atBound(value: number | null, bounds: NumberBounds, direction: 1 | -1): boolean {
  if (value === null) return false
  if (direction > 0) return bounds.max !== undefined && value >= bounds.max
  return bounds.min !== undefined && value <= bounds.min
}
