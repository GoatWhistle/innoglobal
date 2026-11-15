import { useState } from "react"
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
import { Banner, ButtonAnchor, ButtonLink, IconButton, PageHeader, Segmented } from "@/shared/ui"
import { useChatOpen } from "./use-chat-open"
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
  const [chat, setChat] = useChatOpen()
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
      <PageHeader
        eyebrow={
          <ButtonLink className={styles.back} variant="quiet" icon="arrow-left" to="/">
            {t("variants:workspace.fleet")}
          </ButtonLink>
        }
        title={pipe.passport.direction}
        description={t("variants:workspace.pipeLine", {
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
      <div className={styles.workspace} data-chat={chat}>
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
        {chat ? (
          <AssistantChat
            pipe={pipe}
            profile={profile}
            row={row}
            onHide={() => setChat(false)}
            onAction={act}
          />
        ) : (
          <aside className={styles.rail}>
            <IconButton
              icon="message-circle"
              label={t("assistant:show")}
              onClick={() => setChat(true)}
            />
          </aside>
        )}
      </div>
    </div>
  )
}
