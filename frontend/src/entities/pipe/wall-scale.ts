export const WALL_STEPS = 8

export function wallStep(thickness: number, nominal: number, thinnest: number): number {
  const span = nominal - thinnest
  if (span <= 0) return 0
  const depth = Math.min(1, Math.max(0, (nominal - thickness) / span))
  return Math.round(depth * (WALL_STEPS - 1))
}

export function wallColor(step: number): string {
  return `var(--wall-${step})`
}
