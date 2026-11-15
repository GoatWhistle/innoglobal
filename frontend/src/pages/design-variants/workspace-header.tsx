import type { PipeSummary } from "@/entities/pipe"
import { useTranslation } from "@/shared/i18n"
import { Button, ButtonAnchor } from "@/shared/ui"
import styles from "./workspace-shell.module.css"

export function WorkspaceHeader({
  pipe,
  queue,
  onQueue,
}: {
  readonly pipe: PipeSummary
  readonly queue: boolean
  readonly onQueue: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className={styles.actions}>
      <Button variant="quiet" aria-pressed={queue} onClick={onQueue}>
        {t("variants:queueTitle", { count: pipe.priority_count })}
      </Button>
      <ButtonAnchor
        variant="quiet"
        href="/api/v1/exports/result.csv"
        icon="download"
        aria-label={t("variants:export")}
      >
        <span className="visually-hidden">{t("variants:export")}</span>
      </ButtonAnchor>
    </div>
  )
}
