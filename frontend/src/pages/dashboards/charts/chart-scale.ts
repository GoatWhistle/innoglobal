import { useEffect, useRef, useState } from "react"

export interface ChartScale {
  readonly width: number
  readonly height: number
  readonly x: (meters: number) => number
  readonly y: (value: number) => number
}
export function niceTicks(low: number, high: number, count: number): number[] {
  const raw = (high - low) / Math.max(1, count)
  if (!(raw > 0)) return [low]
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? raw
  const ticks: number[] = []
  for (let v = Math.ceil(low / step) * step; v <= high + step * 1e-6; v += step)
    ticks.push(Number(v.toFixed(6)))
  return ticks
}
export function createScale(
  width: number,
  height: number,
  range: { readonly from: number; readonly to: number },
  domain: readonly [number, number],
  inset = 6,
): ChartScale {
  const [low, high] = domain
  return {
    width,
    height,
    x: (m) => ((m - range.from) / (range.to - range.from)) * width,
    y: (v) => inset + (1 - (v - low) / (high - low)) * (height - inset * 2),
  }
}
export function useChartBox<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [box, setBox] = useState({ width: 960, height: 280 })
  useEffect(() => {
    const element = ref.current
    if (element === null || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(([entry]) => {
      if (entry === undefined) return
      const width = Math.max(1, Math.round(entry.contentRect.width)),
        height = Math.max(1, Math.round(entry.contentRect.height))
      setBox((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, ...box }
}
