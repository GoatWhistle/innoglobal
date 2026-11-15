import type { AssistantAction, AssistantMessage } from "@/entities/assistant"
import type { DistanceRange, PipeSummary, Profile } from "@/entities/pipe"

interface ActionHandlers {
  profile: Profile
  pipe: PipeSummary
  select: (id: number) => void
  setQueue: (v: boolean) => void
  setChat: (v: boolean) => void
  setDate: (v: string) => void
  setCharts: (v: boolean) => void
  setSource: (v: boolean) => void
  zoom: (v: DistanceRange) => void
  setMode: (v: "route" | "unroll") => void
}
export function applyAssistantAction(
  action: AssistantAction,
  message: AssistantMessage,
  {
    profile,
    pipe,
    select,
    setQueue,
    setChat,
    setDate,
    setCharts,
    setSource,
    zoom,
    setMode,
  }: ActionHandlers,
) {
  if (
    message.context.snapshot_id !== profile.snapshot_id ||
    message.context.pipe_id !== pipe.pipe_id
  )
    return
  if (action.kind === "select") {
    const id = action.segment_ids?.[0]
    if (validSegment(id, profile)) select(id)
    return
  }
  if (action.kind === "priorities") {
    setQueue(true)
    setChat(false)
  }
  if (action.kind === "compare") {
    if (!validDate(action.date, profile.run_dates)) return
    select(message.context.segment_id)
    setDate(String(action.date))
    setCharts(true)
  }
  if (action.kind === "source") {
    select(message.context.segment_id)
    setSource(true)
  }
  if (action.kind === "range" && action.from_m != null && action.to_m != null) {
    zoom({ from: action.from_m, to: action.to_m })
    setCharts(true)
  }
  if (action.kind === "view") setMode(action.view === "unroll" ? "unroll" : "route")
}

function validDate(date: string | null | undefined, dates: readonly string[]) {
  return Boolean(date && dates.includes(date))
}

function validSegment(id: number | undefined, profile: Profile): id is number {
  return id !== undefined && profile.rows.some((row) => row.segment_id === id)
}
