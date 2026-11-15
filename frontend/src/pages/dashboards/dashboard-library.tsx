import { useState } from "react"
import {
  catalogDefinition,
  type Dashboard,
  KINDS,
  type WidgetContext,
  type WidgetDefinition,
} from "@/entities/dashboard"
import type { WorkspaceProps } from "@/features/engineering-variants"
import { useTranslation } from "@/shared/i18n"
import { Button, Card, Segmented, TextField } from "@/shared/ui"
import { DashboardGenerator } from "./dashboard-generator"
import styles from "./dashboard-library.module.css"
import { DashboardWidget } from "./dashboard-widget"
import { WidgetThumbnail } from "./widget-thumbnail"
export function DashboardLibrary({
  onAdd,
  onSave,
  workspace,
  context,
  definitions,
  boards,
  onRemove,
}: {
  readonly onSave: (definition: WidgetDefinition) => void
  readonly onAdd: (definition: WidgetDefinition) => void
  readonly workspace: WorkspaceProps
  readonly context: WidgetContext
  readonly definitions: WidgetDefinition[]
  readonly boards: Dashboard[]
  readonly onRemove: (id: string) => void
}) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<"library" | "agent">("library")
  const [query, setQuery] = useState("")
  const [preview, setPreview] = useState<WidgetDefinition | null>(null)
  const [confirm, setConfirm] = useState(false)
  const all = [
    ...KINDS.map((kind) => catalogDefinition(kind, t(`variants:dash.${kind}`))),
    ...definitions.filter((d) => d.source === "agent"),
  ]
  const filtered = all.filter((d) =>
    d.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  )
  return (
    <div className={styles.library}>
      <Segmented
        label={t("variants:dash.add")}
        value={tab}
        onChange={setTab}
        options={[
          { value: "library", label: t("variants:dash.library") },
          { value: "agent", label: t("variants:dash.agent") },
        ]}
      />
      <div hidden={tab !== "agent"}>
        <DashboardGenerator context={context} workspace={workspace} onAdd={onAdd} onSave={onSave} />
      </div>
      <div hidden={tab !== "library"}>
        {preview ? (
          <div className={styles.library}>
            <Button variant="quiet" icon="arrow-left" onClick={() => setPreview(null)}>
              {t("variants:dash.library")}
            </Button>
            <Card as="div" appearance="plain" title={preview.title}>
              {null}
            </Card>
            <DashboardWidget item={preview} workspace={workspace} />
            <p className={styles.caption}>{t("variants:dash.sourceProfile")}</p>
            <Button
              onClick={() => {
                onAdd(preview)
                setPreview(null)
              }}
            >
              {t("variants:dash.add")}
            </Button>
            {preview.source === "agent" ? (
              <>
                {confirm ? (
                  <p>
                    {t("variants:dash.usedBy", {
                      names: boards
                        .filter((b) => b.items.some((i) => i.definitionId === preview.id))
                        .map((b) => b.title)
                        .join(", "),
                    })}
                  </p>
                ) : null}
                <Button
                  variant="quiet"
                  onClick={() => {
                    if (!confirm) {
                      setConfirm(true)
                      return
                    }
                    onRemove(preview.id)
                    setConfirm(false)
                    setPreview(null)
                  }}
                >
                  {t(confirm ? "variants:dash.confirm" : "variants:dash.removeLibrary")}
                </Button>
              </>
            ) : null}
          </div>
        ) : (
          <div className={styles.library}>
            <TextField
              label={t("variants:dash.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {filtered.length === 0 ? <p>{t("variants:dash.noResults")}</p> : null}
            {filtered.map((def) => (
              <Button
                key={def.id}
                variant="secondary"
                className={styles.entry}
                aria-label={def.title}
                onClick={() => {
                  setPreview(def)
                  setConfirm(false)
                }}
              >
                <span>{def.title}</span>
                <WidgetThumbnail definition={def} workspace={workspace} />
                {boards.some((b) => b.items.some((i) => i.definitionId === def.id)) ? (
                  <span className={styles.caption}>{t("variants:dash.placed")}</span>
                ) : null}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
