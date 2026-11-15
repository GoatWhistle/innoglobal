import type { AnimationEvent } from "react"
import { useTranslation } from "../../../i18n"
import { Button } from "../../primitives/button/button"
import { CloseButton } from "../../primitives/close-button/close-button"
import { Icon } from "../../primitives/icon/icon"
import styles from "./toast-card.module.css"
import { TOAST_ICON, type ToastEntry } from "./toast-store"

export interface ToastCardProps {
  readonly entry: ToastEntry
  readonly onDismiss: (id: number) => void
  readonly onRemoved: (id: number) => void
}

const TIMER_STYLE = {
  neutral: undefined,
  warning: undefined,
  danger: { animationDuration: "var(--timeout-toast-error)" },
} as const

export function ToastCard({ entry, onDismiss, onRemoved }: ToastCardProps) {
  const { t } = useTranslation()
  const tone = entry.tone ?? "neutral"
  const onAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && entry.leaving) onRemoved(entry.id)
  }
  return (
    <div
      className={styles.toast}
      data-tone={tone}
      data-leaving={entry.leaving || undefined}
      role={tone === "danger" ? "alert" : undefined}
      onAnimationEnd={onAnimationEnd}
    >
      <Icon name={entry.icon ?? TOAST_ICON[tone]} size="md" className={styles.icon} />
      <p className={styles.text}>
        <b className={styles.title}>{entry.title}</b>
        {entry.text === undefined ? null : <span>{entry.text}</span>}
      </p>
      <CloseButton
        size="compact"
        label={t("common:toast.dismiss")}
        className={styles.close}
        onClick={() => onDismiss(entry.id)}
      />
      {entry.action === undefined ? null : (
        <div className={styles.actions}>
          <Button
            size="compact"
            variant={tone === "danger" ? "danger" : "secondary"}
            icon={entry.action.icon}
            onClick={entry.action.onClick}
          >
            {entry.action.label}
          </Button>
        </div>
      )}
      <span
        className={styles.timer}
        style={TIMER_STYLE[tone]}
        aria-hidden="true"
        onAnimationEnd={(event) => {
          event.stopPropagation()
          onDismiss(entry.id)
        }}
      />
    </div>
  )
}
