import { useMutation } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { isApiError } from "@/shared/api"
import {
  type AssistantAction,
  type AssistantContext,
  type AssistantEvent,
  type AssistantInput,
  streamAssistant,
} from "@/shared/api/assistant-stream"

export interface AssistantMessage {
  readonly id: string
  readonly prompt: string
  readonly context: AssistantContext
  readonly text: string
  readonly actions: AssistantAction[]
  readonly values: NonNullable<AssistantEvent["values"]>
  readonly status: string
  readonly error: string | null
}

export function useAssistant(context: AssistantContext) {
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const controller = useRef<AbortController | null>(null)
  const previous = useRef(new Map<string, AssistantInput>())
  const mutation = useMutation({
    mutationFn: (args: {
      body: AssistantInput
      signal: AbortSignal
      onEvent: (event: AssistantEvent) => void
    }) => streamAssistant(args.body, args.signal, args.onEvent),
    retry: false,
  })
  useEffect(() => () => controller.current?.abort(), [])
  const run = async (body: AssistantInput, retryId?: string) => {
    if (controller.current) return
    const abort = new AbortController()
    controller.current = abort
    const id = retryId ?? crypto.randomUUID()
    previous.current.set(id, body)
    const message: AssistantMessage = {
      id,
      prompt: body.prompt,
      context: { ...body.context },
      text: "",
      actions: [],
      values: [],
      status: "connecting",
      error: null,
    }
    setMessages((rows) =>
      retryId ? rows.map((row) => (row.id === id ? message : row)) : [...rows, message],
    )
    const update = (change: (row: AssistantMessage) => AssistantMessage) =>
      setMessages((rows) => rows.map((row) => (row.id === id ? change(row) : row)))
    try {
      await mutation.mutateAsync({
        body,
        signal: abort.signal,
        onEvent: (event) => {
          if (abort.signal.aborted) return
          update((row) => ({
            ...row,
            text: row.text + (event.text ?? ""),
            actions: [...row.actions, ...(event.actions ?? [])],
            values: [...row.values, ...(event.values ?? [])],
            status: event.type === "done" ? "done" : event.code || row.status,
          }))
        },
      })
    } catch (error) {
      update((row) => ({
        ...row,
        status: abort.signal.aborted ? "stopped" : "error",
        error: abort.signal.aborted ? null : isApiError(error) ? error.code : "connection",
      }))
    } finally {
      controller.current = null
    }
  }
  return {
    messages,
    busy: mutation.isPending,
    send: (prompt: string) => {
      if (!prompt.trim()) return
      const history = messages
        .filter((row) => row.status === "done")
        .slice(-6)
        .flatMap((row) => [
          {
            role: "user" as const,
            content: JSON.stringify({ context: row.context, prompt: row.prompt }),
          },
          { role: "assistant" as const, content: row.text },
        ])
      void run({ prompt, context: { ...context }, history })
    },
    stop: () => controller.current?.abort(),
    retry: (id: string) => {
      const request = previous.current.get(id)
      if (request) void run(request, id)
    },
  }
}
