import { useMemo, useRef, useState } from "react"
import {
  KINDS,
  type WidgetContext,
  type WidgetDefinition,
  type WidgetKind,
} from "@/entities/dashboard"
import type { WorkspaceProps } from "@/features/engineering-variants"
import { useWidgetGenerator } from "@/features/widget-generator"
import { unavailableWidgetGenerator, type WidgetGeneratorPort } from "@/shared/api/widget-contract"
import { useTranslation } from "@/shared/i18n"
import { Banner, Button, Select, Skeleton, TextField } from "@/shared/ui"
import styles from "./dashboard-library.module.css"
import { DashboardWidget } from "./dashboard-widget"
export function DashboardGenerator({
  context,
  workspace,
  onAdd,
  onSave,
  port = unavailableWidgetGenerator,
}: {
  readonly context: WidgetContext
  readonly workspace: WorkspaceProps
  readonly onSave: (definition: WidgetDefinition) => void
  readonly onAdd: (definition: WidgetDefinition) => void
  readonly port?: WidgetGeneratorPort
}) {
  const { t } = useTranslation()
  const [prompt, setPrompt] = useState("")
  const generator = useWidgetGenerator(port, context)
  const consumed = useRef<object | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const definition = useMemo(
    () => (generator.draft ? { ...generator.draft, id: crypto.randomUUID() } : null),
    [generator.draft],
  )
  if (!port.available)
    return (
      <Banner tone="info" title={t("variants:dash.unavailable")}>
        <p>{t("variants:dash.useLibrary")}</p>
      </Banner>
    )
  return (
    <div className={styles.library}>
      <TextField
        label={t("variants:dash.prompt")}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <Button
        disabled={!prompt.trim() || generator.status === "loading"}
        onClick={() => void generator.generate(prompt)}
      >
        {t(generator.draft ? "variants:dash.refine" : "variants:dash.generate")}
      </Button>
      {generator.status === "loading" ? (
        <>
          <Skeleton shape="block" />
          <Button variant="quiet" onClick={generator.cancel}>
            {t("variants:dash.cancel")}
          </Button>
        </>
      ) : null}
      {generator.status === "error" ? (
        <Banner tone="warning" title={t("variants:dash.invalidDraft")} />
      ) : null}
      {generator.status === "cancelled" ? (
        <p role="status">{t("variants:dash.cancelled")}</p>
      ) : null}
      {generator.draft && generator.status === "ready" ? (
        <>
          <TextField
            label={t("variants:dash.name")}
            value={generator.draft.title}
            onChange={(e) =>
              generator.draft && generator.setDraft({ ...generator.draft, title: e.target.value })
            }
          />
          <Select
            label={t("variants:dash.chartType")}
            value={generator.draft.kind}
            options={KINDS.map((k) => ({ value: k, label: t(`variants:dash.${k}`) }))}
            onChange={(k) =>
              generator.draft &&
              generator.setDraft({
                ...generator.draft,
                kind: k as WidgetKind,
                unit: k === "elevation" ? "m" : "mm",
              })
            }
          />
          <p>{generator.draft.description}</p>
          <DashboardWidget item={{ ...generator.draft, id: "preview" }} workspace={workspace} />
          <p>{t("variants:dash.sourceProfile")}</p>
          <Button
            variant="secondary"
            disabled={!definition || savedId === definition.id || !definition.title.trim()}
            onClick={() => {
              if (definition) {
                onSave(definition)
                setSavedId(definition.id)
              }
            }}
          >
            {t(
              savedId === definition?.id
                ? "variants:dash.librarySaved"
                : "variants:dash.saveLibrary",
            )}
          </Button>
          <Button
            disabled={generator.added || !generator.draft.title.trim()}
            onClick={() => {
              if (!generator.draft || consumed.current === generator.draft) return
              consumed.current = generator.draft
              if (definition) onAdd(definition)
              generator.markAdded()
            }}
          >
            {t(generator.added ? "variants:dash.added" : "variants:dash.add")}
          </Button>
        </>
      ) : null}
    </div>
  )
}
