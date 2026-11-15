import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import {
  catalogDefinition,
  createDashboard,
  createItem,
  type Dashboard,
  useDashboards,
  type WidgetContext,
  type WidgetDefinition,
  type WidgetKind,
} from "@/entities/dashboard"
import { type PipeSummary, type Profile, useWorkspaceState } from "@/entities/pipe"
import type { WorkspaceProps } from "@/features/engineering-variants"
import { useTranslation } from "@/shared/i18n"
export function useDashboardEditor(pipe: PipeSummary, profile: Profile) {
  const { t } = useTranslation(),
    [params, setParams] = useSearchParams(),
    store = useDashboards()
  const state = useWorkspaceState(profile.rows, profile.rows[0]?.segment_id ?? 0)
  const [catalog] = useState(() =>
    (["forecast", "delta", "priority"] as WidgetKind[]).map((k) =>
      catalogDefinition(k, t(`variants:dash.${k}`)),
    ),
  )
  const [initial] = useState(() =>
    createDashboard(pipe.pipe_id, t("variants:dash.overview"), catalog.map(createItem)),
  )
  const [bootstrapped, setBootstrapped] = useState(false)
  const [empty] = useState(() => createDashboard(pipe.pipe_id, t("variants:dash.new")))
  const boards = store.boards.filter((b) => b.pipeId === pipe.pipe_id)
  const board =
    boards.find((b) => b.id === params.get("dashboard")) ??
    boards[0] ??
    (bootstrapped ? empty : initial)
  const requestedDate = params.get("baseline") ?? pipe.last_observed_run ?? "nominal"
  const date = profile.run_dates.includes(requestedDate) ? requestedDate : "nominal"
  const row = profile.rows.find((r) => r.segment_id === state.segment) ?? profile.rows[0]
  const context: WidgetContext = {
    snapshotId: profile.snapshot_id,
    pipeId: pipe.pipe_id,
    segment: state.segment,
    from: state.range.from,
    to: state.range.to,
    baseline: date,
  }
  const started = useRef(false)
  const [hover, setHover] = useState<number | null>(null)
  const switchBoard = (b: Dashboard) =>
    setParams((p) => {
      const next = new URLSearchParams(p)
      next.set("dashboard", b.id)
      next.set("pipe", String(pipe.pipe_id))
      if (b.context) {
        for (const key of ["segment", "from", "to", "baseline"] as const)
          next.set(key, String(b.context[key]))
      }
      return next
    })
  useEffect(() => {
    if (!started.current) {
      started.current = true
      setBootstrapped(true)
      if (boards.length === 0) {
        store.save({ ...initial, context }, catalog, false)
        return
      }
      if (!params.has("segment") && board.context) {
        switchBoard(board)
        return
      }
    }
    if (boards.length === 0) return
    if (JSON.stringify(board.context) !== JSON.stringify(context))
      store.save({ ...board, context }, catalog, false)
  })
  const save = (b: Dashboard, definitions: WidgetDefinition[] = []) => {
    store.save({ ...b, context }, [...catalog, ...definitions])
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        next.set("dashboard", b.id)
        next.set("pipe", String(pipe.pipe_id))
        return next
      },
      { replace: true },
    )
  }
  const add = (definition: WidgetDefinition) =>
    save({ ...board, items: [...board.items, createItem(definition)] }, [definition])
  const back = new URLSearchParams(params)
  back.delete("dashboard")
  const workspace: WorkspaceProps | null = row
    ? {
        pipe,
        profile,
        row,
        range: state.range,
        onSelect: state.select,
        onRange: state.zoom,
        onReset: state.reset,
        section: null,
        scene: null,
        baselineDate: date === "nominal" ? undefined : date,
        hoverPosition: hover,
        onHoverPosition: setHover,
      }
    : null
  const focus = () => {
    if (!row) return
    const width = state.range.to - state.range.from,
      center = (row.start_m + row.end_m) / 2
    const from = Math.max(0, Math.min(pipe.passport.length_m - width, center - width / 2))
    state.zoom({ from, to: Math.min(pipe.passport.length_m, from + width) })
  }
  return {
    store,
    boards,
    board,
    context,
    workspace,
    back,
    date,
    state,
    switchBoard,
    save,
    add,
    focus,
    definitions: [...new Map([...catalog, ...store.definitions].map((d) => [d.id, d])).values()],
    setDate: (v: string) =>
      setParams(
        (p) => {
          const next = new URLSearchParams(p)
          next.set("baseline", v)
          return next
        },
        { replace: true },
      ),
  }
}
export type DashboardEditor = ReturnType<typeof useDashboardEditor>
