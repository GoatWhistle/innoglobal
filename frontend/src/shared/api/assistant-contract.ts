export interface AssistantContext {
  readonly pipe_id: number
  readonly segment_id: number
  readonly snapshot_id: string
  readonly target_date: string
  readonly comparison_date?: string | null
  readonly scope?: "segment" | "pipe"
  readonly from_m?: number | null
  readonly to_m?: number | null
}
export interface AssistantInput {
  readonly prompt: string
  readonly context: AssistantContext
  readonly history?: readonly { role: "user" | "assistant"; content: string }[]
}
export interface AssistantAction {
  readonly kind: "select" | "range" | "view" | "source" | "compare" | "priorities"
  readonly segment_ids?: number[]
  readonly from_m?: number | null
  readonly to_m?: number | null
  readonly view?: "route" | "unroll" | "section" | null
  readonly source?: "segment" | "model" | "ranking" | null
  readonly date?: string | null
}
export interface AssistantEvent {
  readonly type: "status" | "delta" | "evidence" | "done" | "error"
  readonly text: string
  readonly code: string
  readonly actions: AssistantAction[]
  readonly values: Record<string, unknown>[]
}
