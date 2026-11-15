import { useEffect, useRef, useState } from "react"
import {
  validWidgetDraft,
  type WidgetContext,
  type WidgetDraft,
  type WidgetGeneratorPort,
} from "@/shared/api/widget-contract"
export function useWidgetGenerator(port: WidgetGeneratorPort, context: WidgetContext) {
  const [draft, setDraft] = useState<WidgetDraft | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error" | "cancelled">("idle")
  const [added, setAdded] = useState(false)
  const request = useRef<AbortController | null>(null)
  const identity = JSON.stringify(context)
  useEffect(() => {
    void identity
    request.current?.abort()
    setDraft(null)
    setStatus("idle")
    setAdded(false)
    return () => request.current?.abort()
  }, [identity])
  const generate = async (prompt: string) => {
    if (!port.available || !prompt.trim()) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setStatus("loading")
    setAdded(false)
    const stale = () => controller.signal.aborted || request.current !== controller
    try {
      const result = await port.generate(
        { prompt, context, ...(draft ? { previousDraft: draft } : {}) },
        controller.signal,
      )
      if (stale()) return
      if (!validWidgetDraft(result)) throw new Error("invalid_widget_draft")
      setDraft({ ...result, source: "agent", prompt })
      setStatus("ready")
    } catch {
      if (!stale()) setStatus("error")
    }
  }
  return {
    draft,
    status,
    added,
    generate,
    setDraft,
    markAdded: () => setAdded(true),
    cancel: () => {
      request.current?.abort()
      setStatus("cancelled")
    },
  }
}
