import { type RefObject, useCallback, useEffect, useRef, useState } from "react"
import { motionMs, prefersReducedMotion } from "@/shared/motion"
import { mixView, toWorld, type View, zoomAt } from "./map-geometry"

const WHEEL_STEP = 0.0015

function viscous(t: number): number {
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t)
}

export interface MapViewControl {
  readonly view: View
  readonly animateTo: (target: View) => void
  readonly pan: (from: View, dx: number, dy: number, scale: number) => void
  readonly zoomBy: (factor: number) => void
}

export function useMapView(initial: View, canvas: RefObject<HTMLCanvasElement | null>) {
  const [view, setView] = useState(initial)
  const current = useRef(initial)
  const frame = useRef(0)
  const commit = useCallback((next: View) => {
    current.current = next
    setView(next)
  }, [])
  const stop = useCallback(() => cancelAnimationFrame(frame.current), [])
  const animateTo = useCallback(
    (target: View) => {
      stop()
      if (prefersReducedMotion()) {
        commit(target)
        return
      }
      const from = current.current
      const start = performance.now()
      const duration = motionMs("--dur-scene-long")
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration)
        commit(mixView(from, target, viscous(progress)))
        if (progress < 1) frame.current = requestAnimationFrame(tick)
      }
      frame.current = requestAnimationFrame(tick)
    },
    [commit, stop],
  )
  const pan = useCallback(
    (from: View, dx: number, dy: number, scale: number) => {
      stop()
      commit({ ...from, x: from.x - dx / scale, y: from.y - dy / scale })
    },
    [commit, stop],
  )
  const zoomBy = useCallback(
    (factor: number) => {
      const v = current.current
      animateTo(zoomAt(v, factor, [v.x + v.width / 2, v.y + v.height / 2]))
    },
    [animateTo],
  )
  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      stop()
      const box = element.getBoundingClientRect()
      const focus = toWorld(current.current, box, event.clientX, event.clientY)
      commit(zoomAt(current.current, Math.exp(event.deltaY * WHEEL_STEP), focus))
    }
    element.addEventListener("wheel", onWheel, { passive: false })
    return () => element.removeEventListener("wheel", onWheel)
  }, [canvas, commit, stop])
  useEffect(() => stop, [stop])
  return { view, animateTo, pan, zoomBy } satisfies MapViewControl
}
