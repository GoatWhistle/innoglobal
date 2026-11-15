import { useState } from "react"
import { useSearchParams } from "react-router"
import { type PipeSummary, type Profile, usePipes, useProfile } from "@/entities/pipe"
import { useDocumentTitle, useTranslation } from "@/shared/i18n"
import {
  Banner,
  Button,
  ButtonLink,
  EmptyState,
  PageHeader,
  QueryView,
  Skeleton,
  TextField,
} from "@/shared/ui"
import { DashboardCanvas } from "./dashboard-canvas"
import { DashboardLibrary } from "./dashboard-library"
import { DashboardPanel } from "./dashboard-panel"
import { DashboardContext, DashboardToolbar } from "./dashboard-toolbar"
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
  const { t } = useTranslation()
  const editor = useDashboardEditor(pipe, profile)
  const { board, boards, store, workspace } = editor
  const [editing, setEditing] = useState(false),
    [library, setLibrary] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)
  if (!workspace) return null
  return (
    <div className={styles.page}>
      <ButtonLink variant="quiet" icon="arrow-left" to={`/?${editor.back}`}>
        {t("variants:workspace.return")}
      </ButtonLink>
      <PageHeader title={t("variants:dash.title")} description={pipe.passport.direction} />
      <DashboardToolbar
        editor={editor}
        pipeId={pipe.pipe_id}
        editing={editing}
        library={library}
        onEditing={setEditing}
        onLibrary={setLibrary}
      />
      {editing ? (
        <div className={styles.rename}>
          <TextField
            label={t("variants:dash.name")}
            value={board.title}
            onChange={(e) => editor.save({ ...board, title: e.target.value })}
          />
          <Button
            variant="quiet"
            icon="trash"
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
      <DashboardContext
        editor={editor}
        pipe={pipe}
        profile={profile}
        segment={workspace.row.segment_id}
      />
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
            <EmptyState
              icon="chart"
              title={t("variants:dash.empty")}
              description={t("variants:dash.emptyHint")}
              action={
                <Button icon="plus" onClick={() => setLibrary(true)}>
                  {t("variants:dash.add")}
                </Button>
              }
            />
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
