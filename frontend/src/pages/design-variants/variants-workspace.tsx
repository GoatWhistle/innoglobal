import { type KeyboardEvent, useEffect } from "react"
import { useSearchParams } from "react-router"
import {
  type PipeList,
  type PipeSummary,
  type Profile,
  rememberSelectedPipe,
  useWorkspaceState,
} from "@/entities/pipe"
import { Inspection, SegmentSection, type WorkspaceProps } from "@/features/engineering-variants"
import { PipeScene } from "@/features/pipe-scene"
import { SegmentStrip } from "@/features/segment-strip"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { useInputModality } from "@/shared/motion"
import { Banner, ButtonAnchor, NumberField, Segmented, Select } from "@/shared/ui"
import { PipeControls } from "./pipe-controls"
import styles from "./variants-workspace.module.css"

export interface VariantsWorkspaceProps {
  readonly pipe: PipeSummary
  readonly pipes: PipeList
  readonly profile: Profile
}
export function VariantsWorkspace({ pipe, pipes, profile }: VariantsWorkspaceProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const [params, setParams] = useSearchParams()
  const raw = params.get("view")
  const scene = raw === "unroll" || raw === "section" ? raw : "route"
  const setScene = (view: "route" | "unroll" | "section") =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set("view", view)
        return next
      },
      { replace: true },
    )
  const state = useWorkspaceState(profile.rows, pipe.thinnest_segment_id)
  const modality = useInputModality()
  const keyboard = (event: KeyboardEvent) => {
    modality.onKeyDown()
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.altKey ||
      event.metaKey ||
      event.ctrlKey
    )
      return
    const next = (["route", "unroll", "section"] as const)[Number(event.key) - 1]
    if (next) {
      event.preventDefault()
      setScene(next)
    }
  }
  const row = profile.rows.find((item) => item.segment_id === state.segment) ?? profile.rows[0]
  useEffect(() => {
    rememberSelectedPipe(pipe.pipe_id)
  }, [pipe.pipe_id])
  if (!row) return null
  const changePipe = (value: string) => {
    const next = pipes.items.find((item) => String(item.pipe_id) === value)
    if (!next) return
    setParams((current) => {
      const search = new URLSearchParams(current)
      search.set("pipe", value)
      search.set("segment", String(Math.min(row.segment_id, next.segments - 1)))
      search.delete("from")
      search.delete("to")
      return search
    })
  }
  const section = <SegmentSection row={row} pipe={pipe} />
  const props: WorkspaceProps = {
    pipe,
    profile,
    row,
    range: state.range,
    onSelect: state.select,
    onRange: state.zoom,
    onReset: state.reset,
    section,
    scene: (
      <section aria-label={t("pipe:scene.label")}>
        <div className={styles.cameraBar}>
          <Segmented
            label={t("pipe:scene.label")}
            value={scene}
            onChange={setScene}
            appearance="camera"
            options={[
              { value: "route", label: t("pipe:scene.route"), icon: "pipe" },
              { value: "unroll", label: t("pipe:scene.unroll"), icon: "layers" },
              { value: "section", label: t("pipe:scene.section"), icon: "cube" },
            ]}
          />
          <p>{t(`pipe:restoration.${scene}Question`)}</p>
        </div>
        <PipeScene
          pipe={pipe}
          profile={profile}
          selected={row.segment_id}
          mode={scene}
          instant={modality.instant}
          onSelect={state.select}
          fallback={section}
          readout={false}
        />
        <SegmentStrip
          rows={profile.rows}
          nominal={profile.nominal_wall_mm}
          thinnest={pipe.thinnest_mm}
          selected={state.segment}
          range={state.range}
          onSelect={state.select}
          onRange={state.zoom}
        />
        <PipeControls
          key={state.segment}
          rows={profile.rows}
          selected={state.segment}
          onSelect={state.select}
        />
      </section>
    ),
  }
  return (
    <div
      className={styles.page}
      onKeyDownCapture={keyboard}
      onPointerDownCapture={modality.onPointerDown}
    >
      <header className={styles.header}>
        <div>
          <h1>{t("variants:names.inspection")}</h1>
          <p>{t("variants:descriptions.inspection")}</p>
        </div>
      </header>
      <div className={styles.context}>
        <Select
          label={t("variants:pipe")}
          value={String(pipe.pipe_id)}
          onChange={changePipe}
          options={pipes.items.map((item) => ({
            value: String(item.pipe_id),
            label: String(item.pipe_id),
          }))}
        />
        <NumberField
          className={styles.segment}
          label={t("variants:segment")}
          value={row.segment_id}
          min={profile.rows[0]?.segment_id ?? 0}
          max={profile.rows.at(-1)?.segment_id ?? 0}
          onChange={(value) => {
            if (value !== null) state.select(value)
          }}
        />
        <p className={styles.target}>
          {t("variants:target")}
          <strong>{format.date(pipe.target_date)}</strong>
        </p>
        <ButtonAnchor
          className={styles.export}
          href="/api/v1/exports/result.csv"
          variant="quiet"
          icon="download"
        >
          {t("variants:export")}
        </ButtonAnchor>
      </div>
      {state.invalid ? <Banner tone="warning" title={t("variants:invalid")} /> : null}
      <Inspection {...props} />
      <div className={styles.mobileExport}>
        <ButtonAnchor href="/api/v1/exports/result.csv" variant="quiet" icon="download">
          {t("variants:export")}
        </ButtonAnchor>
      </div>
    </div>
  )
}
