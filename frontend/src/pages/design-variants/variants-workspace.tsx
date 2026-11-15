import { useState } from "react"
import { useSearchParams } from "react-router"
import type { AssistantAction, AssistantMessage } from "@/entities/assistant"
import { type PipeList, type PipeSummary, type Profile, useWorkspaceState } from "@/entities/pipe"
import { AssistantDock } from "@/features/engineering-assistant"
import {
  ComparisonPanel,
  PriorityQueue,
  SegmentFacts,
  SegmentSection,
  type WorkspaceProps,
} from "@/features/engineering-variants"
import { MaterialPipe } from "@/features/material-pipe"
import { PipeScene } from "@/features/pipe-scene"
import { useTranslation } from "@/shared/i18n"
import { Banner, Button, Disclosure, Drawer, Icon, Segmented } from "@/shared/ui"
import { SegmentEditor } from "./segment-editor"
import { UnrollGrid } from "./unroll-grid"
import { applyAssistantAction } from "./workspace-actions"
import { WorkspaceHeader } from "./workspace-header"
import { WorkspaceMetrics } from "./workspace-metrics"
import styles from "./workspace-shell.module.css"

export interface VariantsWorkspaceProps {
  readonly pipe: PipeSummary
  readonly pipes: PipeList
  readonly profile: Profile
}
export function VariantsWorkspace({ pipe, profile }: VariantsWorkspaceProps) {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const state = useWorkspaceState(profile.rows, 0)
  const selected = params.has("segment") && !state.invalid ? state.segment : null
  const row = profile.rows.find((r) => r.segment_id === state.segment) ?? profile.rows[0]
  const mode = params.get("view") === "unroll" ? "unroll" : "route"
  const [editing, setEditing] = useState(false),
    [inspecting, setInspecting] = useState(selected !== null)
  const [chat, setChat] = useState(false)
  const [side, setSide] = useState<"left" | "right">("right")
  const [metrics, setMetrics] = useState(true),
    [queue, setQueue] = useState(false),
    [charts, setCharts] = useState(false)
  const [order, setOrder] = useState<"rank" | "distance">("rank")
  const [date, setDate] = useState(pipe.last_observed_run ?? undefined)
  const [source, setSource] = useState(false)
  const [controlsHost, setControlsHost] = useState<HTMLDivElement | null>(null)
  if (!row) return null
  const select = (id: number) => {
    state.select(id)
    setInspecting(mode === "route")
    setMetrics(true)
  }
  const setMode = (view: "route" | "unroll") => {
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        next.set("view", view)
        return next
      },
      { replace: true },
    )
    setInspecting(false)
  }
  const workspace: WorkspaceProps = {
    pipe,
    profile,
    row,
    range: state.range,
    onSelect: select,
    onRange: state.zoom,
    onReset: state.reset,
    section: <SegmentSection row={row} pipe={pipe} />,
    scene: null,
    baselineDate: date,
    onComparisonDate: setDate,
  }
  const act = (action: AssistantAction, message: AssistantMessage) =>
    applyAssistantAction(action, message, {
      profile,
      pipe,
      select,
      setQueue,
      setChat,
      setDate,
      setCharts,
      setSource,
      zoom: state.zoom,
      setMode,
    })
  return (
    <div className={styles.page}>
      {state.invalid ? <Banner tone="warning" title={t("variants:invalid")} /> : null}
      <h1 className="visually-hidden">{pipe.passport.direction}</h1>
      <div className={styles.workspace} data-editing={editing} data-side={side}>
        {!chat && selected !== null && metrics ? (
          <WorkspaceMetrics
            pipe={pipe}
            row={row}
            inspecting={inspecting}
            onInspect={() => setInspecting((v) => !v)}
            onSelect={select}
            onCharts={() => setCharts((v) => !v)}
            onHide={() => setMetrics(false)}
          />
        ) : null}
        <main className={styles.stage}>
          <nav className={styles.toolbar}>
            <Segmented
              label={t("pipe:scene.label")}
              value={mode}
              onChange={setMode}
              options={[
                { value: "route", label: t("variants:pipe") },
                { value: "unroll", label: t("pipe:scene.unroll") },
              ]}
            />
            <SegmentEditor
              key={selected}
              selected={selected}
              max={pipe.segments - 1}
              onSelect={select}
              onActive={setEditing}
            />
            <div ref={setControlsHost} className={styles.sceneActions} />
            <WorkspaceHeader
              pipe={pipe}
              queue={queue}
              onQueue={() => {
                setQueue(!queue)
                setChat(false)
              }}
            />
            {!metrics ? (
              <Button variant="quiet" onClick={() => setMetrics(true)}>
                {t("variants:workspace.metrics")}
              </Button>
            ) : null}
          </nav>
          <div className={styles.visual}>
            {mode === "route" ? (
              <MaterialPipe
                pipe={pipe}
                profile={profile}
                selected={selected}
                inspecting={inspecting}
                controlsHost={controlsHost}
                onPhase={() => undefined}
              />
            ) : (
              <>
                <div className={styles.unroll}>
                  <PipeScene
                    pipe={pipe}
                    profile={profile}
                    selected={row.segment_id}
                    mode="unroll"
                    instant
                    onSelect={(id) => select(id)}
                    fallback={workspace.section}
                    readout={false}
                    controls={false}
                  />
                </div>
                <UnrollGrid profile={profile} selected={selected} onSelect={select} />
              </>
            )}
          </div>
        </main>
        <AssistantDock
          pipe={pipe}
          profile={profile}
          row={row}
          hidden={!chat}
          side={side}
          onSide={setSide}
          onClose={() => {
            setChat(false)
          }}
          onMinimize={() => {
            setChat(false)
          }}
          onAction={act}
        />
      </div>
      {!chat ? (
        <Button
          className={styles.chatLauncher}
          aria-label={t("assistant:title")}
          onClick={() => {
            setChat(true)
            setQueue(false)
          }}
        >
          <Icon name="message-circle" size="control" />
        </Button>
      ) : null}
      {charts ? <ComparisonPanel {...workspace} date={date} onDate={setDate} compact /> : null}
      <Disclosure title={t("variants:segmentEvidence")}>
        <SegmentFacts {...workspace} detailsOnly />
      </Disclosure>
      <Drawer open={queue} onClose={() => setQueue(false)} title={t("variants:queue")}>
        <PriorityQueue
          pipe={pipe}
          row={row}
          rows={profile.rows
            .filter((r) => r.priority_rank !== null)
            .sort((a, b) =>
              order === "rank"
                ? (a.priority_rank ?? 0) - (b.priority_rank ?? 0)
                : a.start_m - b.start_m,
            )}
          order={order}
          onOrder={setOrder}
          onSelect={(id) => {
            select(id)
            setQueue(false)
          }}
        />
      </Drawer>
      <Drawer open={source} onClose={() => setSource(false)} title={t("variants:sources")}>
        <SegmentFacts {...workspace} detailsOnly />
      </Drawer>
    </div>
  )
}
