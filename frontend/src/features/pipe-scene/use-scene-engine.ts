import { useEffect, useRef, useState } from "react"
import { motionMs } from "@/shared/motion"
import { useTheme } from "@/shared/theme"
import { type AnnotationFrame, createWallEngine, type WallEngine } from "./engine/engine.js"
import type { PipeSceneProps } from "./pipe-scene"

export function useSceneEngine(props: PipeSceneProps) {
  const { theme } = useTheme()
  const canvas = useRef<HTMLCanvasElement>(null)
  const marker = useRef<HTMLDivElement>(null)
  const axes = useRef<HTMLDivElement>(null)
  const engine = useRef<WallEngine | null>(null)
  const latest = useRef(props)
  latest.current = props
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const target = canvas.current
    if (!target) return
    let renderer: WallEngine | null = null
    let observer: ResizeObserver | null = null
    let rendered = false
    const annotate = (frame: AnnotationFrame) => {
      if (!rendered) {
        rendered = true
        setReady(true)
      }
      if (marker.current) {
        marker.current.hidden = frame.moving
        marker.current.style.transform = `translate(${frame.marker.x}px, ${frame.marker.y}px)`
      }
      if (axes.current) {
        axes.current.hidden = !frame.flat
        const [a, b] = frame.sheet
        Object.assign(axes.current.style, {
          left: `${Math.min(a.x, b.x)}px`,
          top: `${Math.min(a.y, b.y)}px`,
          width: `${Math.abs(b.x - a.x)}px`,
          height: `${Math.abs(b.y - a.y)}px`,
        })
      }
    }
    try {
      renderer = createWallEngine(target, {
        durations: {
          route: motionMs("--dur-scene-long"),
          unroll: motionMs("--dur-scene-long"),
          section: motionMs("--dur-scene-cut"),
          move: motionMs("--dur-scene"),
        },
        onPick: ({ meters }) => {
          const current = latest.current
          const row =
            current.profile.rows.find((item) => meters >= item.start_m && meters < item.end_m) ??
            current.profile.rows.at(-1)
          if (row)
            current.onSelect(row.segment_id, current.mode === "unroll" ? "section" : undefined)
        },
        onFrame: annotate,
        onFailure: () => {
          renderer?.dispose()
          engine.current = null
          setFailed(true)
        },
      })
      engine.current = renderer
      observer = new ResizeObserver(([entry]) => {
        if (entry)
          renderer?.resize(
            entry.contentRect.width,
            entry.contentRect.height,
            entry.contentRect.width >= 1024,
          )
      })
      observer.observe(target)
    } catch {
      setFailed(true)
    }
    return () => {
      observer?.disconnect()
      renderer?.dispose()
      engine.current = null
    }
  }, [])
  useEffect(() => {
    engine.current?.setData({
      lengthM: props.pipe.passport.length_m,
      nominalMm: props.profile.nominal_wall_mm,
      segments: props.profile.rows.map((row) => ({
        startM: row.start_m,
        endM: row.end_m,
        predictedMm: row.forecast_mm,
      })),
    })
  }, [props.pipe, props.profile])
  useEffect(() => {
    engine.current?.setTheme(theme)
  }, [theme])
  useEffect(() => {
    const instant = props.instant
    engine.current?.select(
      props.profile.rows.findIndex((row) => row.segment_id === props.selected),
      instant,
    )
    engine.current?.setMode(props.mode, instant)
  }, [props.selected, props.mode, props.profile, props.instant])
  return { canvas, marker, axes, failed, ready }
}
