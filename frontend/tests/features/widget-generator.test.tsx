import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useWidgetGenerator } from "@/features/widget-generator"
import {
  validWidgetDraft,
  type WidgetContext,
  type WidgetDraft,
  type WidgetGeneratorPort,
} from "@/shared/api/widget-contract"

const context: WidgetContext = {
  snapshotId: "snapshot1",
  pipeId: 10,
  segment: 2,
  from: 0,
  to: 100,
  baseline: "nominal",
}
const draft: WidgetDraft = {
  version: 1,
  kind: "forecast",
  title: "Forecast",
  description: "Measured profile",
  source: "agent",
  sourceId: "profile",
  unit: "mm",
}
describe("widget generator boundary", () => {
  it("previews valid responses and passes previous draft when refining", async () => {
    const generate = vi.fn().mockResolvedValue(draft)
    const hook = renderHook(() => useWidgetGenerator({ available: true, generate }, context))
    await act(() => hook.result.current.generate("Compare"))
    expect(hook.result.current.status).toBe("ready")
    const previousDraft = hook.result.current.draft
    await act(() => hook.result.current.generate("Refine"))
    expect(generate.mock.calls[1]?.[0]).toMatchObject({ previousDraft, prompt: "Refine", context })
    act(() => hook.result.current.markAdded())
    expect(hook.result.current.added).toBe(true)
  })
  it("rejects prose, arbitrary sources, wrong units and unsupported types", () => {
    for (const value of [
      "<script>test</script>",
      { ...draft, kind: "html" },
      { ...draft, sourceId: "sql" },
      { ...draft, unit: "bar" },
      { ...draft, title: "" },
    ])
      expect(validWidgetDraft(value)).toBe(false)
  })
  it("reports malformed responses and permits a retry", async () => {
    const port = {
      available: true,
      generate: vi.fn().mockResolvedValueOnce({ kind: "html" }).mockResolvedValueOnce(draft),
    }
    const hook = renderHook(() => useWidgetGenerator(port, context))
    await act(() => hook.result.current.generate("First"))
    expect(hook.result.current.status).toBe("error")
    await act(() => hook.result.current.generate("Retry"))
    expect(hook.result.current.status).toBe("ready")
  })
  it("ignores a cancelled response even when the transport resolves late", async () => {
    let resolve: (value: unknown) => void = () => undefined
    const port: WidgetGeneratorPort = {
      available: true,
      generate: () =>
        new Promise((done) => {
          resolve = done
        }),
    }
    const hook = renderHook(() => useWidgetGenerator(port, context))
    let pending: Promise<void> | undefined
    act(() => {
      pending = hook.result.current.generate("Compare")
    })
    act(() => hook.result.current.cancel())
    await act(async () => {
      resolve(draft)
      await pending
    })
    expect(hook.result.current.status).toBe("cancelled")
    expect(hook.result.current.draft).toBeNull()
  })
  it("cancels the previous pipe on context change", async () => {
    let resolve: (value: unknown) => void = () => undefined
    const port: WidgetGeneratorPort = {
      available: true,
      generate: () =>
        new Promise((done) => {
          resolve = done
        }),
    }
    const hook = renderHook(({ c }) => useWidgetGenerator(port, c), {
      initialProps: { c: context },
    })
    let pending: Promise<void> | undefined
    act(() => {
      pending = hook.result.current.generate("Compare")
    })
    hook.rerender({ c: { ...context, pipeId: 11 } })
    await act(async () => {
      resolve(draft)
      await pending
    })
    expect(hook.result.current.status).toBe("idle")
    expect(hook.result.current.draft).toBeNull()
  })
  it("does not call an unavailable adapter", async () => {
    const generate = vi.fn()
    const hook = renderHook(() => useWidgetGenerator({ available: false, generate }, context))
    await act(() => hook.result.current.generate("Compare"))
    expect(generate).not.toHaveBeenCalled()
  })
})
