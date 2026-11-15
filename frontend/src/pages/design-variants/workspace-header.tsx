import type { PipeSummary } from "@/entities/pipe"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { Button, ButtonAnchor, ButtonLink } from "@/shared/ui"
import styles from "./workspace-shell.module.css"
export function WorkspaceHeader({
  pipe,
  queue,
  chat,
  setQueue,
  setChat,
  setMinimized,
}: {
  readonly pipe: PipeSummary
  readonly queue: boolean
  readonly chat: boolean
  readonly setQueue: (v: boolean) => void
  readonly setChat: (v: boolean) => void
  readonly setMinimized: (v: boolean) => void
}) {
  const { t } = useTranslation(),
    format = useFormatters()
  return (
    <header className={styles.heading}>
      <ButtonLink to="/" variant="quiet" icon="arrow-left">
        {t("variants:workspace.fleet")}
      </ButtonLink>
      <div>
        <h1>{pipe.passport.direction}</h1>
        <p>
          {pipe.pipe_id} · {pipe.passport.section_name} / {format.date(pipe.target_date)}
        </p>
      </div>
      <ButtonAnchor
        variant="quiet"
        href="/api/v1/exports/result.csv"
        icon="download"
        aria-label={t("variants:export")}
      >
        <span className="visually-hidden">{t("variants:export")}</span>
      </ButtonAnchor>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          onClick={() => {
            setQueue(!queue)
            setChat(false)
          }}
        >
          {t("variants:queueTitle", { count: pipe.priority_count })}
        </Button>
        <Button
          variant={chat ? "primary" : "secondary"}
          onClick={() => {
            setChat(!chat)
            setMinimized(false)
            setQueue(false)
          }}
        >
          {t("assistant:title")}
        </Button>
      </div>
    </header>
  )
}
