import { useLayoutEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import type { AssistantAction, AssistantMessage } from "@/entities/assistant"
import { type PipeList, type PipeSummary, type Profile, useWorkspaceState } from "@/entities/pipe"
import { AssistantChat } from "@/features/engineering-assistant"
import {
  SegmentFacts,
  SegmentSection,
  UnrollGrid,
  type WorkspaceProps,
} from "@/features/engineering-variants"
import { MaterialPipe } from "@/features/material-pipe"
import { useFormatters, useTranslation } from "@/shared/i18n"
import {
  Banner,
  BrandMark,
  Button,
  ButtonAnchor,
  ButtonLink,
  PageBar,
  Segmented,
} from "@/shared/ui"
import { ChatResizer } from "./chat-resizer"
import { useChatDock } from "./use-chat-dock"
import { WorkspacePanel } from "./workspace-panel"
import styles from "./workspace-shell.module.css"

export interface VariantsWorkspaceProps {
  readonly pipe: PipeSummary
  readonly pipes: PipeList
  readonly profile: Profile
}

type View = "route" | "unroll"

export function VariantsWorkspace({ pipe, profile }: VariantsWorkspaceProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const [params, setParams] = useSearchParams()
  const state = useWorkspaceState(profile.rows, 0)
  const selected = params.has("segment") && !state.invalid ? state.segment : null
  const row = profile.rows.find((r) => r.segment_id === state.segment) ?? profile.rows[0]
  const mode: View = params.get("view") === "unroll" ? "unroll" : "route"
  const [inspecting, setInspecting] = useState(false)
  const dock = useChatDock()
  const frame = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    frame.current?.style.setProperty("--chat-width", `${dock.width}px`)
  }, [dock.width])
  const navigate = useNavigate()
  const [date, setDate] = useState(pipe.last_observed_run ?? undefined)
  if (!row) return null
  const select = (id: number) => {
    state.select(id)
    setInspecting(false)
  }
  const setMode = (view: View) => {
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
  const act = (action: AssistantAction, _message: AssistantMessage) => {
    if (action.kind === "source" && action.source === "model") {
      navigate("/model")
      return
    }
    const id = action.segment_ids?.[0]
    if (id !== undefined) select(id)
    if (action.kind === "view") setMode(action.view === "unroll" ? "unroll" : "route")
  }
  const context = new URLSearchParams({ pipe: String(pipe.pipe_id) })
  if (selected !== null) context.set("segment", String(selected))
  return (
    <div className={styles.page}>
      {state.invalid ? <Banner tone="warning" title={t("variants:invalid")} /> : null}
      <PageBar
        label={t("common:nav.label")}
        crumbs={[{ label: t("variants:workspace.fleet"), to: "/" }]}
        title={pipe.passport.direction}
        meta={t("variants:workspace.pipeLine", {
          id: pipe.pipe_id,
          length: format.number(pipe.passport.length_m / 1000, 1),
        })}
        actions={
          <div className={styles.headActions}>
            <Segmented
              label={t("pipe:scene.label")}
              value={mode}
              onChange={setMode}
              options={[
                { value: "route", label: t("variants:pipe") },
                { value: "unroll", label: t("pipe:scene.unroll") },
              ]}
            />
            <ButtonLink variant="secondary" icon="chart" to={`/dashboards?${context}`}>
              {t("assistant:dashboards")}
            </ButtonLink>
            <ButtonAnchor variant="secondary" href="/api/v1/exports/result.csv" icon="download">
              {t("variants:workspace.csv")}
            </ButtonAnchor>
          </div>
        }
      />
      <div ref={frame} className={styles.workspace} data-chat={dock.open}>
        <WorkspacePanel
          pipe={pipe}
          profile={profile}
          row={row}
          selected={selected}
          inspecting={inspecting}
          onSelect={select}
          details={<SegmentFacts {...workspace} detailsOnly />}
          onInspect={() => {
            if (mode !== "route") setMode("route")
            setInspecting((value) => !value)
          }}
        />
        <main className={styles.stage}>
          {mode === "route" ? (
            <MaterialPipe
              pipe={pipe}
              profile={profile}
              selected={selected}
              inspecting={inspecting}
              onPhase={() => undefined}
            />
          ) : (
            <UnrollGrid profile={profile} selected={selected} onSelect={select} />
          )}
        </main>
        {dock.open ? (
          <div className={styles.chatColumn}>
            <ChatResizer width={dock.width} onResize={dock.setWidth} />
            <AssistantChat
              pipe={pipe}
              profile={profile}
              row={row}
              onHide={() => dock.setOpen(false)}
              onAction={act}
            />
          </div>
        ) : null}
      </div>
      {dock.open ? null : (
        <Button variant="secondary" className={styles.launcher} onClick={() => dock.setOpen(true)}>
          <span className={styles.launcherBody}>
            <BrandMark variant="symbol" size="sm" state="calm" />
            {t("assistant:launcher")}
          </span>
        </Button>
      )}
    </div>
  )
}
