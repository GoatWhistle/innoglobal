import { useState } from "react"
import { useSearchParams } from "react-router"
import { createDashboard } from "@/entities/dashboard"
import { type PipeSummary, type Profile, usePipes, useProfile } from "@/entities/pipe"
import { useDocumentTitle, useFormatters, useTranslation } from "@/shared/i18n"
import { Banner, Button, ButtonLink, QueryView, Select, Skeleton, TextField } from "@/shared/ui"
import { DashboardCanvas } from "./dashboard-canvas"
import { DashboardLibrary } from "./dashboard-library"
import { DashboardPanel } from "./dashboard-panel"
import styles from "./dashboards-page.module.css"
import { useDashboardEditor } from "./use-dashboard-editor"
export function DashboardsPage() {
  const { t } = useTranslation(),
    [params] = useSearchParams(),
    pipes = usePipes()
  useDocumentTitle(t("variants:dash.title"))
  return (
    <QueryView query={pipes} label={t("variants:loading")} skeleton={<Skeleton shape="block" />}>
      {(data) => {
        const pipe =
          data.items.find((p) => p.pipe_id === Number(params.get("pipe"))) ?? data.items[0]
        return pipe ? (
          <Loader key={pipe.pipe_id} pipe={pipe} />
        ) : (
          <Banner tone="warning" title={t("variants:empty")} />
        )
      }}
    </QueryView>
  )
}
function Loader({ pipe }: { readonly pipe: PipeSummary }) {
  const profile = useProfile(pipe.pipe_id),
    { t } = useTranslation()
  return (
    <QueryView query={profile} label={t("variants:loading")} skeleton={<Skeleton shape="block" />}>
      {(data) =>
        data.rows.length ? (
          <Editor pipe={pipe} profile={data} />
        ) : (
          <Banner tone="warning" title={t("variants:empty")} />
        )
      }
    </QueryView>
  )
}
function Editor({ pipe, profile }: { readonly pipe: PipeSummary; readonly profile: Profile }) {
  const { t } = useTranslation(),
    format = useFormatters()
  const editor = useDashboardEditor(pipe, profile)
  const { board, boards, store, workspace } = editor
  const [editing, setEditing] = useState(false),
    [library, setLibrary] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)
  if (!workspace) return null
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <ButtonLink variant="quiet" icon="arrow-left" to={`/?${editor.back}`}>
          {t("variants:workspace.return")}
        </ButtonLink>
        <h1>{t("variants:dash.title")}</h1>
        <span>{pipe.passport.direction}</span>
      </header>
      <div className={styles.toolbar}>
        <Select
          label={t("variants:dash.title")}
          value={board.id}
          onChange={(id) => {
            const next = boards.find((b) => b.id === id)
            if (next) editor.switchBoard(next)
          }}
          options={(boards.length ? boards : [board]).map((b) => ({ value: b.id, label: b.title }))}
        />
        <Button
          variant="secondary"
          onClick={() => {
            editor.save(createDashboard(pipe.pipe_id, t("variants:dash.new")))
            setEditing(true)
          }}
        >
          {t("variants:dash.new")}
        </Button>
        <Button onClick={() => setLibrary(!library)} aria-expanded={library}>
          {t("variants:dash.add")}
        </Button>
        <Button variant="quiet" onClick={() => setEditing(!editing)}>
          {t(editing ? "variants:dash.done" : "variants:dash.edit")}
        </Button>
        <Button variant="quiet" disabled={!store.canUndo} onClick={store.undo}>
          {t("variants:dash.undo")}
        </Button>
      </div>
      {editing ? (
        <div className={styles.toolbar}>
          <TextField
            label={t("variants:dash.name")}
            value={board.title}
            onChange={(e) => editor.save({ ...board, title: e.target.value })}
          />
          <Button
            variant="quiet"
            onClick={() => {
              if (confirm !== board.id) {
                setConfirm(board.id)
                return
              }
              const next = boards.find((item) => item.id !== board.id)
              store.remove(board.id)
              if (next) editor.switchBoard(next)
              setConfirm(null)
            }}
          >
            {t(confirm === board.id ? "variants:dash.confirm" : "variants:dash.delete")}
          </Button>
        </div>
      ) : null}
      <div className={styles.context}>
        <Select
          label={t("variants:baseline")}
          value={editor.date}
          onChange={editor.setDate}
          options={[
            { value: "nominal", label: t("variants:nominalBase") },
            ...profile.run_dates.map((d) => ({ value: d, label: format.date(d) })),
          ]}
        />
        <span>{format.date(pipe.target_date)}</span>
        <span>
          {t("pipe:unit.range", {
            from: format.integer(editor.context.from),
            to: format.integer(editor.context.to),
          })}
        </span>
        <span>{t("variants:dash.selection", { id: workspace.row.segment_id })}</span>
        <Button variant="quiet" onClick={editor.focus}>
          {t("variants:dash.focus")}
        </Button>
        <Button variant="quiet" onClick={editor.state.reset}>
          {t("variants:dash.all")}
        </Button>
      </div>
      {store.error ? (
        <Banner tone="warning" title={t("variants:dash.error")}>
          <Button onClick={store.blocked ? store.reset : store.retry}>
            {t(store.blocked ? "variants:dash.reset" : "variants:dash.retry")}
          </Button>
        </Banner>
      ) : (
        <p className={styles.status}>{t("variants:dash.saved")}</p>
      )}
      <div className={styles.workspace} data-panel={library || undefined}>
        <div className={styles.canvas}>
          {board.items.length ? (
            <DashboardCanvas
              board={board}
              definitions={editor.definitions}
              editing={editing}
              workspace={workspace}
              onChange={editor.save}
            />
          ) : (
            <Button variant="secondary" onClick={() => setLibrary(true)}>
              {t("variants:dash.empty")}
            </Button>
          )}
        </div>
        <DashboardPanel open={library} onClose={() => setLibrary(false)}>
          <DashboardLibrary
            onAdd={editor.add}
            onSave={(definition) => editor.save(board, [definition])}
            workspace={workspace}
            context={editor.context}
            definitions={store.definitions}
            boards={store.boards}
            onRemove={store.removeDefinition}
          />
        </DashboardPanel>
      </div>
    </div>
  )
}
