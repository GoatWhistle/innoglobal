import type { AssistantEvent, AssistantInput } from "./assistant-contract"
import { isAssistantAction } from "./assistant-validation"
import { ApiError } from "./client"

export type {
  AssistantAction,
  AssistantContext,
  AssistantEvent,
  AssistantInput,
} from "./assistant-contract"
export async function streamAssistant(
  body: AssistantInput,
  signal: AbortSignal,
  onEvent: (event: AssistantEvent) => void,
) {
  const response = await fetch("/api/v1/assistant", {
    method: "POST",
    credentials: "same-origin",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok || !response.body) throw new ApiError(response.status, "unavailable")
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let complete = false
  const consume = (line: string) => {
    if (!line.trim()) return
    const event: AssistantEvent = JSON.parse(line)
    if (!["delta", "status", "evidence", "done", "error", "artifact"].includes(event.type))
      throw new ApiError(502, "assistant_stream")
    if (
      typeof event.text !== "string" ||
      typeof event.code !== "string" ||
      !Array.isArray(event.actions) ||
      !event.actions.every(isAssistantAction) ||
      !Array.isArray(event.values)
    )
      throw new ApiError(502, "assistant_stream")
    if (event.type === "error") throw new ApiError(503, event.code)
    if (event.type === "done") complete = true
    onEvent(event)
  }
  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) consume(line)
      if (buffer.length > 2000000) throw new ApiError(502, "assistant_stream")
      if (done) break
    }
    consume(buffer)
    if (!complete) throw new ApiError(502, "assistant_stream")
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}
