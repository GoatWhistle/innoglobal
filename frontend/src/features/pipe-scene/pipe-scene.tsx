import type { CSSProperties, ReactNode } from "react"
import {
  type PipeSummary,
  type Profile,
  useThickness,
  WALL_STEPS,
  wallColor,
} from "@/entities/pipe"
import { useFormatters, useTranslation } from "@/shared/i18n"
import styles from "./pipe-scene.module.css"
import { SceneFallback } from "./scene-fallback"
import { SceneReadout } from "./scene-readout"
import { useSceneEngine } from "./use-scene-engine"

const SWATCHES = Array.from({ length: WALL_STEPS }, (_, step) => wallColor(step))

export interface PipeSceneProps {
  readonly pipe: PipeSummary
  readonly profile: Profile
  readonly instant: boolean
  readonly selected: number
  readonly mode: "route" | "unroll" | "section"
  readonly onSelect: (id: number, mode?: "section") => void
  readonly fallback: ReactNode
  readonly readout?: boolean
}

export function PipeScene(props: PipeSceneProps) {
  const thickness = useThickness()
  const format = useFormatters()
  const selected = props.profile.rows.find((row) => row.segment_id === props.selected)
  const { t } = useTranslation()
  const { canvas, marker, axes, failed, ready } = useSceneEngine(props)
  return (
    <section
      className={styles.stage}
      data-mode={props.mode}
      data-renderer={failed ? "fallback" : ready ? "webgl" : "loading"}
      aria-label={t("pipe:scene.label")}
    >
      <div className={styles.viewport}>
        <canvas
          ref={canvas}
          className={styles.canvas}
          hidden={failed}
          aria-label={t(`pipe:scene.${props.mode}`)}
        />
        {failed ? <SceneFallback {...props} /> : null}
        {failed ? null : (
          <div className={styles.tags} aria-hidden="true">
            <div ref={marker} className={styles.marker} hidden>
              <i className={styles.markerDot} />
              <i className={styles.leader} />
              <span className={styles.tagText}>
                {selected ? thickness.withUnit(selected.forecast_mm) : ""}
              </span>
            </div>
            <div ref={axes} className={styles.axes} hidden>
              <span className={styles.axisStart}>{format.integer(0)}</span>
              <span className={styles.axisEnd}>
                {thickness.distance(props.pipe.passport.length_m)}
              </span>
              <span className={styles.axisCaption}>{t("pipe:restoration.angle")}</span>
            </div>
          </div>
        )}
        {selected && props.readout !== false ? (
          <SceneReadout pipe={props.pipe} row={selected} mode={props.mode} />
        ) : null}
        <div className={styles.scale}>
          <span className={styles.swatches} aria-hidden="true">
            {SWATCHES.map((color) => (
              <i key={color} style={{ "--swatch": color } as CSSProperties} />
            ))}
          </span>
          <span>{t("pipe:restoration.nearNominal")}</span>
          <span>{t("pipe:restoration.thinner")}</span>
        </div>
      </div>
      <p className={styles.caption}>
        {t("pipe:scene.illustration")}
        {failed ? ` ${t("pipe:restoration.fallback")}` : ""}
      </p>
    </section>
  )
}
