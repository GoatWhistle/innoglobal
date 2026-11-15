import { type CSSProperties, useRef, useState } from "react"
import type { Dashboard, DashboardItem, WidgetDefinition } from "@/entities/dashboard"
import type { WorkspaceProps } from "@/features/engineering-variants"
import { useTranslation } from "@/shared/i18n"
import { Button, Card, Select, TextField } from "@/shared/ui"
import styles from "./dashboard-canvas.module.css"
import { DashboardWidget } from "./dashboard-widget"
export function DashboardCanvas({
  board,
  definitions,
  editing,
  workspace,
  onChange,
}: {
  readonly board: Dashboard
  readonly definitions: WidgetDefinition[]
  readonly editing: boolean
  readonly workspace: WorkspaceProps
  readonly onChange: (board: Dashboard) => void
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const { t } = useTranslation(),
    dragging = useRef<string | null>(null)
  const update = (id: string, patch: Partial<DashboardItem>) =>
    onChange({ ...board, items: board.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })
  const move = (id: string, to: number) => {
    const items = [...board.items],
      from = items.findIndex((i) => i.id === id)
    if (from < 0 || to < 0 || to >= items.length || from === to) return
    const [item] = items.splice(from, 1)
    if (item) items.splice(to, 0, item)
    onChange({ ...board, items })
  }
  return (
    <div className={styles.grid}>
      {board.items.map((item, index) => {
        const definition = definitions.find((d) => d.id === item.definitionId)
        if (!definition) return null
        return (
          <section
            key={item.id}
            data-tile={item.id}
            data-dragging={dragId === item.id || undefined}
            className={styles.tile}
            style={{ "--span": item.span } as CSSProperties}
          >
            <header className={styles.header}>
              {editing ? (
                <Button
                  variant="quiet"
                  icon="drag"
                  className={styles.handle}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return
                    e.currentTarget.focus()
                    setDragId(item.id)
                    dragging.current = item.id
                    e.currentTarget.setPointerCapture(e.pointerId)
                  }}
                  onPointerUp={(e) => {
                    const target = document
                      .elementsFromPoint(e.clientX, e.clientY)
                      .map((el) => el.closest<HTMLElement>("[data-tile]"))
                      .find((el) => el && el.dataset.tile !== item.id)?.dataset.tile
                    if (dragging.current && target)
                      move(
                        item.id,
                        board.items.findIndex((i) => i.id === target),
                      )
                    dragging.current = null
                    setDragId(null)
                  }}
                  onPointerCancel={() => {
                    dragging.current = null
                    setDragId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      dragging.current = null
                      setDragId(null)
                    }
                    if (["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"].includes(e.key)) {
                      e.preventDefault()
                      move(item.id, index + (["ArrowUp", "ArrowLeft"].includes(e.key) ? -1 : 1))
                    }
                  }}
                >
                  {t("variants:dash.move")}
                </Button>
              ) : null}
              <Card as="div" appearance="plain" title={item.title}>
                {null}
              </Card>
            </header>
            {editing ? (
              <div className={styles.settings}>
                <TextField
                  label={t("variants:dash.name")}
                  value={item.title}
                  onChange={(e) => update(item.id, { title: e.target.value })}
                />
                <Select
                  label={t("variants:dash.size")}
                  value={String(item.span)}
                  onChange={(v) => update(item.id, { span: Number(v) })}
                  options={(definition.kind === "metric" ? [3, 6, 9, 12] : [6, 9, 12]).map((n) => ({
                    value: String(n),
                    label: { 3: "S", 6: "M", 9: "L", 12: "XL" }[n] ?? "",
                  }))}
                />
                <Button
                  variant="quiet"
                  onClick={() =>
                    onChange({ ...board, items: board.items.filter((i) => i.id !== item.id) })
                  }
                >
                  {t("variants:dash.remove")}
                </Button>
              </div>
            ) : null}
            <DashboardWidget item={{ ...definition, title: item.title }} workspace={workspace} />
          </section>
        )
      })}
    </div>
  )
}
