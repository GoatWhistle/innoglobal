import { useState } from "react"
import { useSearchParams } from "react-router"
import { type PipeList, type PipeSummary, type Profile, useWorkspaceState } from "@/entities/pipe"
import {
  PriorityQueue,
  SegmentFacts,
  SegmentSection,
  UnrollGrid,
  type WorkspaceProps,
} from "@/features/engineering-variants"
import { MaterialPipe } from "@/features/material-pipe"
import { useFormatters, useTranslation } from "@/shared/i18n"
import {
  Banner,
  ButtonAnchor,
  ButtonLink,
  Disclosure,
  Drawer,
  PageHeader,
  ScrollArea,
  Segmented,
} from "@/shared/ui"
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
  const [queue, setQueue] = useState(false)
  const [order, setOrder] = useState<"rank" | "distance">("rank")
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
            <ButtonLink variant="secondary" icon="message-circle" to={`/assistant?${context}`}>
              {t("variants:workspace.askAssistant")}
            </ButtonLink>
            <ButtonLink variant="secondary" icon="chart" to={`/dashboards?${context}`}>
              {t("assistant:dashboards")}
            </ButtonLink>
            <ButtonAnchor variant="secondary" href="/api/v1/exports/result.csv" icon="download">
              {t("variants:workspace.csv")}
            </ButtonAnchor>
          </div>
        }
      />
      <div className={styles.workspace}>
        <WorkspacePanel
          pipe={pipe}
          profile={profile}
          row={row}
          selected={selected}
          inspecting={inspecting}
          onSelect={select}
          onInspect={() => {
            if (mode !== "route") setMode("route")
            setInspecting((value) => !value)
          }}
          onQueue={() => setQueue(true)}
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
            <ScrollArea className={styles.unroll}>
              <UnrollGrid profile={profile} selected={selected} onSelect={select} />
            </ScrollArea>
          )}
        </main>
      </div>
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
    </div>
  )
}
