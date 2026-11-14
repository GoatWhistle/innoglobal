export interface Scale {
  readonly at: (value: number) => number
  readonly invert: (pixel: number) => number
  readonly domain: readonly [number, number]
  readonly range: readonly [number, number]
}

export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): Scale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0 || 1
  return {
    at: (value) => r0 + ((value - d0) / span) * (r1 - r0),
    invert: (pixel) => d0 + ((pixel - r0) / (r1 - r0 || 1)) * span,
    domain,
    range,
  }
}

const STEPS = [1, 2, 2.5, 5, 10] as const

export function niceTicks(min: number, max: number, count: number): number[] {
  const raw = (max - min) / Math.max(1, count)
  if (!(raw > 0)) return [min]
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = (STEPS.find((item) => item * power >= raw) ?? 10) * power
  const first = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let value = first; value <= max + step * 1e-6; value += step) {
    ticks.push(Math.round(value / step) * step)
  }
  return ticks
}

export interface ChartBox {
  readonly width: number
  readonly height: number
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

export const CHART_INSET = { left: 44, right: 18, top: 16, bottom: 28 } as const

export function chartBox(width: number, height: number): ChartBox {
  return {
    width,
    height,
    left: CHART_INSET.left,
    right: width - CHART_INSET.right,
    top: CHART_INSET.top,
    bottom: height - CHART_INSET.bottom,
  }
}

export function pathOf(points: readonly (readonly [number, number] | null)[]): string {
  let path = ""
  let open = false
  for (const point of points) {
    if (point === null) {
      open = false
      continue
    }
    path += `${open ? "L" : "M"}${point[0].toFixed(1)} ${point[1].toFixed(1)}`
    open = true
  }
  return path
}
