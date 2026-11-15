import {
  validWidgetDraft,
  WIDGET_KINDS,
  type WidgetContext,
  type WidgetDraft,
  type WidgetKind,
} from "@/shared/api/widget-contract"

export type { WidgetContext, WidgetDraft, WidgetKind }
export { WIDGET_KINDS as KINDS }
export interface WidgetDefinition extends WidgetDraft {
  id: string
}
export interface DashboardItem {
  id: string
  definitionId: string
  title: string
  span: number
}
export interface Dashboard {
  id: string
  pipeId: number
  title: string
  items: DashboardItem[]
  context?: WidgetContext
}
export interface DashboardStore {
  version: 1
  boards: Dashboard[]
  definitions: WidgetDefinition[]
}
export function catalogDefinition(kind: WidgetKind, title: string): WidgetDefinition {
  return {
    id: `catalog:${kind}`,
    version: 1,
    kind,
    title,
    description: "",
    source: "catalog",
    sourceId: "profile",
    unit: kind === "elevation" ? "m" : "mm",
  }
}
export function createItem(definition: WidgetDefinition): DashboardItem {
  const { kind } = definition
  return {
    id: crypto.randomUUID(),
    definitionId: definition.id,
    title: definition.title,
    span: kind === "metric" ? 3 : kind === "forecast" || kind === "table" ? 12 : 6,
  }
}
export function createDashboard(
  pipeId: number,
  title: string,
  items: DashboardItem[] = [],
): Dashboard {
  return { id: crypto.randomUUID(), pipeId, title, items }
}
export function validStore(value: unknown): value is DashboardStore {
  if (!value || typeof value !== "object") return false
  const data = value as DashboardStore
  return (
    data.version === 1 &&
    Array.isArray(data.definitions) &&
    data.definitions.every((d) => validWidgetDraft(d) && typeof d.id === "string") &&
    Array.isArray(data.boards) &&
    data.boards.every((d) => validBoard(d, data.definitions)) &&
    new Set(data.boards.map((b) => b.id)).size === data.boards.length &&
    new Set(data.definitions.map((d) => d.id)).size === data.definitions.length
  )
}
function validBoard(d: Dashboard, definitions: WidgetDefinition[]): boolean {
  return (
    !!d &&
    typeof d.id === "string" &&
    Number.isInteger(d.pipeId) &&
    typeof d.title === "string" &&
    Array.isArray(d.items) &&
    d.items.every(
      (i) =>
        !!i &&
        typeof i.id === "string" &&
        typeof i.title === "string" &&
        definitions.some(
          (def) => def.id === i.definitionId && (def.kind === "metric" || i.span >= 6),
        ) &&
        [3, 6, 9, 12].includes(i.span),
    ) &&
    new Set(d.items.map((i) => i.id)).size === d.items.length &&
    (d.context === undefined || validContext(d.context, d.pipeId))
  )
}
function validContext(c: WidgetContext, pipeId: number): boolean {
  return (
    !!c &&
    typeof c.snapshotId === "string" &&
    c.pipeId === pipeId &&
    Number.isInteger(c.segment) &&
    Number.isFinite(c.from) &&
    Number.isFinite(c.to) &&
    c.to > c.from &&
    typeof c.baseline === "string"
  )
}
