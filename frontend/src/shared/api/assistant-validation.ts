import type { AssistantAction } from "./assistant-contract"

export function isAssistantAction(value: unknown): value is AssistantAction {
  if (!value || typeof value !== "object") return false
  const action = value as Record<string, unknown>
  if (!["select", "range", "view", "source", "compare", "priorities"].includes(String(action.kind)))
    return false
  if (
    !Array.isArray(action.segment_ids) ||
    !action.segment_ids.every((id) => Number.isInteger(id) && id >= 0)
  )
    return false
  if (action.kind === "select") return action.segment_ids.length === 1
  if (action.kind === "range")
    return (
      typeof action.from_m === "number" &&
      typeof action.to_m === "number" &&
      Number.isFinite(action.from_m) &&
      Number.isFinite(action.to_m) &&
      action.from_m >= 0 &&
      action.from_m < action.to_m
    )
  if (action.kind === "view") return ["route", "unroll", "section"].includes(String(action.view))
  if (action.kind === "source")
    return ["segment", "model", "ranking"].includes(String(action.source))
  if (action.kind === "compare")
    return typeof action.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(action.date)
  return true
}
