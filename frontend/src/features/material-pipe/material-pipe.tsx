import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { PipeSummary, Profile } from "@/entities/pipe"
import { useTranslation } from "@/shared/i18n"
import { Banner, IconButton } from "@/shared/ui"
import { createPipe, type MaterialEngine } from "./engine/engine.js"
import styles from "./material-pipe.module.css"

export function MaterialPipe({
  pipe,
  profile,
  selected,
  inspecting,
  onPhase,
  controlsHost,
}: {
  readonly pipe: PipeSummary
  readonly profile: Profile
  readonly selected: number | null
  readonly inspecting: boolean
  readonly controlsHost?: HTMLElement | null
  readonly onPhase: (phase: string) => void
}) {
  const { t } = useTranslation()
  const host = useRef<HTMLDivElement>(null)
  const engine = useRef<MaterialEngine | null>(null)
  const phase = useRef(onPhase)
  phase.current = onPhase
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const element = host.current
    if (!element) return
    try {
      const scene = createPipe(element, pipe.passport.direction, (value) => phase.current(value))
      engine.current = scene
      scene.corrosionMap(profile.rows, pipe.passport.length_m)
      const canvas = element.querySelector("canvas")
      const lost = () => {
        element.dataset.renderer = "fallback"
        setFailed(true)
      }
      canvas?.addEventListener("webglcontextlost", lost)
      return () => {
        canvas?.removeEventListener("webglcontextlost", lost)
        scene.dispose()
        engine.current = null
      }
    } catch {
      setFailed(true)
    }
    return undefined
  }, [pipe, profile])
  useEffect(() => {
    const row = profile.rows.find((r) => r.segment_id === selected)
    const fraction = row ? (row.start_m + row.end_m) / 2 / pipe.passport.length_m : null
    if (inspecting && fraction !== null) {
      engine.current?.inspect(fraction)
      return
    }
    engine.current?.reset()
    engine.current?.mark(fraction)
  }, [selected, inspecting, profile, pipe.passport.length_m])
  const controls = (
    <div className={styles.controls} data-inline={Boolean(controlsHost)}>
      <IconButton
        icon="minus"
        label={t("variants:workspace.zoomOut")}
        onClick={() => engine.current?.zoom(1 / 1.2)}
      />
      <IconButton
        icon="plus"
        label={t("variants:workspace.zoomIn")}
        onClick={() => engine.current?.zoom(1.2)}
      />
      <IconButton
        icon="reset"
        label={t("variants:workspace.reset")}
        onClick={() => engine.current?.fit()}
      />
    </div>
  )
  return (
    <div className={styles.scene}>
      <section ref={host} className={styles.host} aria-label={t("pipe:scene.drag")} />
      {controlsHost ? createPortal(controls, controlsHost) : controls}
      {failed ? <Banner tone="warning" title={t("pipe:restoration.fallback")} /> : null}
    </div>
  )
}
