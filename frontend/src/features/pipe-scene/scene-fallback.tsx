import { useEffect, useRef } from "react"
import { indexAt } from "@/entities/pipe"
import { useTranslation } from "@/shared/i18n"
import { useTheme } from "@/shared/theme"
import { paintFallback } from "./fallback-paint"
import type { PipeSceneProps } from "./pipe-scene"
import styles from "./scene-fallback.module.css"

export function SceneFallback(props: PipeSceneProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const target = canvas.current
    if (!target) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      target.width = Math.round(entry.contentRect.width)
      target.height = Math.round(entry.contentRect.height)
      paintFallback(target, props.profile, props.mode, props.selected, theme)
    })
    observer.observe(target)
    paintFallback(target, props.profile, props.mode, props.selected, theme)
    return () => observer.disconnect()
  }, [props.profile, props.mode, props.selected, theme])
  return props.mode === "section" ? (
    <div className={styles.section}>{props.fallback}</div>
  ) : (
    <canvas
      className={styles.canvas}
      ref={canvas}
      role="img"
      aria-label={t(`pipe:scene.${props.mode}`)}
      onPointerDown={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        const fraction = Math.max(
          0,
          Math.min(1, (event.clientX - bounds.left - 44) / (bounds.width - 62)),
        )
        const row =
          props.profile.rows[indexAt(props.profile.rows, fraction * props.pipe.passport.length_m)]
        if (row) props.onSelect(row.segment_id, props.mode === "unroll" ? "section" : undefined)
      }}
    />
  )
}
