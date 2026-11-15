export const WIDGET_KINDS = [
  "forecast",
  "delta",
  "priority",
  "table",
  "metric",
  "elevation",
  "grid",
] as const
export type WidgetKind = (typeof WIDGET_KINDS)[number]
export interface WidgetDraft {
  version: 1
  kind: WidgetKind
  title: string
  description: string
  source: "catalog" | "agent"
  sourceId: "profile"
  unit: "mm" | "m"
  prompt?: string
}
export interface WidgetContext {
  snapshotId: string
  pipeId: number
  segment: number
  from: number
  to: number
  baseline: string
}
export interface WidgetGeneratorPort {
  readonly available: boolean
  generate(
    input: { prompt: string; context: WidgetContext; previousDraft?: WidgetDraft },
    signal: AbortSignal,
  ): Promise<unknown>
}
export const unavailableWidgetGenerator: WidgetGeneratorPort = {
  available: false,
  generate: async () => {
    throw new Error("widget_generator_unavailable")
  },
}
export function validWidgetDraft(value: unknown): value is WidgetDraft {
  if (!value || typeof value !== "object") return false
  const d = value as WidgetDraft
  return (
    d.version === 1 &&
    WIDGET_KINDS.includes(d.kind) &&
    typeof d.title === "string" &&
    d.title.trim().length > 0 &&
    d.title.length <= 160 &&
    typeof d.description === "string" &&
    d.description.length <= 2000 &&
    ["catalog", "agent"].includes(d.source) &&
    d.sourceId === "profile" &&
    d.unit === (d.kind === "elevation" ? "m" : "mm") &&
    (d.prompt === undefined || typeof d.prompt === "string")
  )
}
