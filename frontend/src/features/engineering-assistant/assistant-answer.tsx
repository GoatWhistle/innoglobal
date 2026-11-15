import type { AssistantAction, AssistantMessage } from "@/entities/assistant"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { BrandMark, Button, ButtonLink } from "@/shared/ui"
import { AssistantArtifact } from "./assistant-artifact"
import styles from "./engineering-assistant.module.css"

export interface AssistantAnswerProps {
  readonly message: AssistantMessage
  readonly onAction: (action: AssistantAction, message: AssistantMessage) => void
  readonly onRetry: () => void
}
export function AssistantAnswer({ message, onAction, onRetry }: AssistantAnswerProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const actions = message.actions.filter(
    (item, index, rows) =>
      rows.findIndex((other) => JSON.stringify(item) === JSON.stringify(other)) === index,
  )
  const values = message.values.filter(
    (item, index, rows) =>
      rows.findIndex((other) => other.segment_id === item.segment_id) === index,
  )
  return (
    <article className={styles.answer} data-testid="assistant-answer">
      <p className={styles.question}>{message.prompt}</p>
      <div className={styles.reply}>
        <BrandMark
          variant="symbol"
          size="sm"
          state={message.status === "done" || message.error ? "calm" : "busy"}
          className={styles.avatar}
        />
        <div className={styles.replyBody}>
          <p className={styles.response}>{message.text}</p>
          {message.artifacts?.length ? (
            <ButtonLink to="/dashboards">{t("assistant:dashboards")}</ButtonLink>
          ) : null}
          {message.artifacts?.map((id) => (
            <AssistantArtifact key={id} id={id} />
          ))}
          {values.length ? (
            <dl className={styles.evidence}>
              {values.map((value) => (
                <div key={String(value.segment_id)}>
                  <dt>{t("assistant:rangeValue", { from: value.start_m, to: value.end_m })}</dt>
                  <dd>
                    {t("assistant:mm", { value: format.number(Number(value.forecast_mm), 2) })}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className={styles.actions}>
            {actions.map((action) => (
              <Button
                variant="secondary"
                size="compact"
                key={JSON.stringify(action)}
                onClick={() => onAction(action, message)}
              >
                {t(`assistant:actions.${action.kind}`, { segment: action.segment_ids?.[0] ?? "" })}
              </Button>
            ))}
          </div>
          <AnswerState message={message} onRetry={onRetry} />
          <FrozenContext message={message} />
        </div>
      </div>
    </article>
  )
}

function FrozenContext({ message }: { readonly message: AssistantMessage }) {
  const { t } = useTranslation()
  const format = useFormatters()
  return (
    <p className={styles.context}>
      {t("assistant:messageContext", {
        pipe: message.context.pipe_id,
        segment: message.context.segment_id,
        date: format.date(message.context.target_date),
      })}{" "}
      {t(message.context.scope === "pipe" ? "assistant:pipeScope" : "assistant:segmentScope")}
    </p>
  )
}

const STATUS_KEY = {
  stopped: "assistant:stopped",
  reading: "assistant:reading",
} as const

const ERROR_KEY = {
  unavailable: "assistant:unavailable",
  auth_required: "assistant:authRequired",
} as const

function AnswerState({
  message,
  onRetry,
}: {
  readonly message: AssistantMessage
  readonly onRetry: () => void
}) {
  const { t } = useTranslation()
  if (message.error)
    return (
      <div role="alert" className={styles.error}>
        <p>{t(ERROR_KEY[message.error as keyof typeof ERROR_KEY] ?? "assistant:error")}</p>
        <Button variant="secondary" onClick={onRetry}>
          {t("assistant:retry")}
        </Button>
      </div>
    )
  if (message.status === "done") return null
  return (
    <p role="status" className={styles.context}>
      {t(STATUS_KEY[message.status as keyof typeof STATUS_KEY] ?? "assistant:connecting")}
    </p>
  )
}
