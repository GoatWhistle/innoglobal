import type { ReactNode } from "react"
import { useTranslation } from "../../../i18n"
import { Button } from "../../primitives/button/button"
import type { IconName } from "../../primitives/icon/icon"
import { StatePanel, type StatePanelTone } from "../state-panel/state-panel"

export interface ErrorStateProps {
  readonly title: string
  readonly description?: ReactNode | undefined
  readonly meta?: ReactNode | undefined
  readonly icon?: IconName | undefined
  readonly tone?: Exclude<StatePanelTone, "warning"> | undefined
  readonly onRetry?: (() => void) | undefined
  readonly retryPending?: boolean | undefined
  readonly retryLabel?: string | undefined
  readonly extraAction?: ReactNode
  readonly className?: string | undefined
}

export function ErrorState({
  title,
  description,
  meta,
  icon = "error",
  tone = "danger",
  onRetry,
  retryPending = false,
  retryLabel,
  extraAction,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation()
  const retry =
    onRetry === undefined ? null : (
      <Button icon="refresh" pending={retryPending} onClick={onRetry}>
        {retryLabel ?? t("common:action.retry")}
      </Button>
    )
  const hasActions = retry !== null || extraAction !== undefined
  return (
    <StatePanel
      role="alert"
      icon={icon}
      tone={tone}
      title={title}
      description={description}
      meta={meta}
      actions={
        hasActions ? (
          <>
            {retry}
            {extraAction}
          </>
        ) : undefined
      }
      className={className}
    />
  )
}
