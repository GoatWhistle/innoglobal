import { type KeyboardEvent, useEffect, useState } from "react"
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
import { Banner, Button, ButtonAnchor, Disclosure, Segmented, Select } from "@/shared/ui"
import { AssistantWorkspace } from "./assistant-workspace"
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
  const [comparisonDate, setComparisonDate] = useState(pipe.last_observed_run ?? undefined)
  const [highlights, setHighlights] = useState<number[]>([])
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
    baselineDate: comparisonDate,
    onComparisonDate: setComparisonDate,
    highlights,
    sceneControls: (
      <>
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
      </>
    ),
    overview: (
      <SegmentStrip
        rows={profile.rows}
        nominal={profile.nominal_wall_mm}
        thinnest={pipe.thinnest_mm}
        selected={state.segment}
        range={state.range}
        onSelect={state.select}
        onRange={state.zoom}
      />
    ),
    scene: (
      <section aria-label={t("pipe:scene.label")}>
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
      </section>
    ),
  }
  return (
    <div
      className={styles.page}
      onKeyDownCapture={keyboard}
      onPointerDownCapture={modality.onPointerDown}
    >
      <div className={styles.context}>
        <h1>{t("variants:names.inspection")}</h1>
        <Select
          className={styles.pipe}
          label={t("variants:pipe")}
          value={String(pipe.pipe_id)}
          onChange={changePipe}
          options={pipes.items.map((item) => ({
            value: String(item.pipe_id),
            label: String(item.pipe_id),
          }))}
        />
        <PipeControls
          key={state.segment}
          rows={profile.rows}
          selected={state.segment}
          onSelect={state.select}
        />
        <p className={styles.target}>
          {t("variants:target")}
          <strong>{format.date(pipe.target_date)}</strong>
        </p>
        <p className={styles.baseline}>
          {t(pipe.last_observed_run ? "variants:lastVtd" : "variants:commissioned")}
          <strong>
            {pipe.last_observed_run
              ? format.date(pipe.last_observed_run)
              : pipe.passport.commissioned_at
                ? format.date(pipe.passport.commissioned_at)
                : t("variants:missing")}
          </strong>
        </p>
        <Disclosure title={t("assistant:exports")}>
          <ButtonAnchor href="/api/v1/exports/result.csv" variant="quiet" icon="download">
            {t("variants:export")}
          </ButtonAnchor>
        </Disclosure>
      </div>
      {state.invalid ? <Banner tone="warning" title={t("variants:invalid")} /> : null}
      {highlights.length ? (
        <div role="status">
          {t("assistant:highlight", { segments: highlights.join(", ") })}
          <Button
            variant="quiet"
            onClick={() => {
              setHighlights([])
              state.reset()
            }}
          >
            {t("assistant:clear")}
          </Button>
        </div>
      ) : null}
      <Inspection
        {...props}
        aside={(range) => (
          <AssistantWorkspace
            workspace={{ ...props, range }}
            date={comparisonDate}
            onDate={setComparisonDate}
            onView={setScene}
            onHighlight={setHighlights}
          />
        )}
      />
      <div className={styles.mobileExport}>
        <ButtonAnchor href="/api/v1/exports/result.csv" variant="quiet" icon="download">
          {t("variants:export")}
        </ButtonAnchor>
      </div>
    </div>
  )
}
