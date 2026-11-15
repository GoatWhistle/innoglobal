import { createDashboard, type Dashboard } from "@/entities/dashboard"
import type { PipeSummary, Profile } from "@/entities/pipe"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { Banner, Button, Icon, Select } from "@/shared/ui"
import styles from "./dashboard-toolbar.module.css"
import type { DashboardEditor } from "./use-dashboard-editor"

export interface DashboardToolbarProps {
  readonly editor: DashboardEditor
  readonly pipeId: number
  readonly editing: boolean
  readonly library: boolean
  readonly onEditing: (editing: boolean) => void
  readonly onLibrary: (open: boolean) => void
}

export function DashboardToolbar({
  editor,
  pipeId,
  editing,
  library,
  onEditing,
  onLibrary,
}: DashboardToolbarProps) {
  const { t } = useTranslation()
  const { board, boards, store } = editor
  const choices: Dashboard[] = boards.length ? boards : [board]
  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.group}>
          <Select
            label={t("variants:dash.board")}
            value={board.id}
            onChange={(id) => {
              const next = boards.find((b) => b.id === id)
              if (next) editor.switchBoard(next)
            }}
            options={choices.map((b) => ({ value: b.id, label: b.title }))}
          />
          <Button
            variant="secondary"
            icon="plus"
            onClick={() => {
              editor.save(createDashboard(pipeId, t("variants:dash.new")))
              onEditing(true)
            }}
          >
            {t("variants:dash.new")}
          </Button>
        </div>
        <div className={styles.group}>
          {store.error ? null : (
            <p className={styles.status} role="status">
              <Icon name="check" size="sm" />
              {t("variants:dash.saved")}
            </p>
          )}
          {store.canUndo ? (
            <Button variant="quiet" icon="reset" onClick={store.undo}>
              {t("variants:dash.undo")}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            icon={editing ? "check" : "edit"}
            aria-pressed={editing}
            onClick={() => onEditing(!editing)}
          >
            {t(editing ? "variants:dash.done" : "variants:dash.edit")}
          </Button>
          <Button icon="plus" onClick={() => onLibrary(!library)} aria-expanded={library}>
            {t("variants:dash.add")}
          </Button>
        </div>
      </div>
      {store.error ? (
        <Banner tone="warning" title={t("variants:dash.error")}>
          <Button onClick={store.blocked ? store.reset : store.retry}>
            {t(store.blocked ? "variants:dash.reset" : "variants:dash.retry")}
          </Button>
        </Banner>
      ) : null}
    </>
  )
}

export interface DashboardContextProps {
  readonly editor: DashboardEditor
  readonly pipe: PipeSummary
  readonly profile: Profile
  readonly segment: number
}

export function DashboardContext({ editor, pipe, profile, segment }: DashboardContextProps) {
  const { t } = useTranslation(),
    format = useFormatters()
  const facts = [
    { key: "target", label: t("variants:dash.target"), value: format.date(pipe.target_date) },
    {
      key: "range",
      label: t("variants:dash.range"),
      value: t("pipe:unit.range", {
        from: format.integer(editor.context.from),
        to: format.integer(editor.context.to),
      }),
    },
    {
      key: "segment",
      label: t("variants:dash.segment"),
      value: t("variants:dash.selection", { id: segment }),
    },
  ]
  return (
    <div className={styles.context}>
      <div className={styles.group}>
        <Select
          label={t("variants:baseline")}
          value={editor.date}
          onChange={editor.setDate}
          options={[
            { value: "nominal", label: t("variants:nominalBase") },
            ...profile.run_dates.map((d) => ({ value: d, label: format.date(d) })),
          ]}
        />
        <dl className={styles.facts}>
          {facts.map((fact) => (
            <div key={fact.key} className={styles.fact}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className={styles.group}>
        <Button variant="secondary" icon="map-pin" onClick={editor.focus}>
          {t("variants:dash.focus")}
        </Button>
        <Button variant="quiet" icon="expand" onClick={editor.state.reset}>
          {t("variants:dash.all")}
        </Button>
      </div>
    </div>
  )
}
