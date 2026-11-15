import type { AssistantAction, AssistantMessage } from "@/entities/assistant"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { Button } from "@/shared/ui"
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
      <FrozenContext message={message} />
      <p className={styles.response}>{message.text}</p>
      {values.length ? (
        <dl className={styles.evidence}>
          {values.map((value) => (
            <div key={String(value.segment_id)}>
              <dt>{t("assistant:rangeValue", { from: value.start_m, to: value.end_m })}</dt>
              <dd>{t("assistant:mm", { value: format.number(Number(value.forecast_mm), 2) })}</dd>
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
      {message.status !== "done" && !message.error ? (
        <p role="status" className={styles.context}>
          {t(
            message.status === "stopped"
              ? "assistant:stopped"
              : message.status === "reading"
                ? "assistant:reading"
                : "assistant:connecting",
          )}
        </p>
      ) : null}
      {message.error ? (
        <div role="alert" className={styles.error}>
          <p>
            {t(
              message.error === "unavailable"
                ? "assistant:unavailable"
                : message.error === "auth_required"
                  ? "assistant:authRequired"
                  : "assistant:error",
            )}
          </p>
          <Button variant="secondary" onClick={onRetry}>
            {t("assistant:retry")}
          </Button>
        </div>
      ) : null}
    </article>
  )
}

function FrozenContext({ message }: { readonly message: AssistantMessage }) {
  const { t } = useTranslation()
  const format = useFormatters()
  return (
    <>
      <p className={styles.context}>
        {t("assistant:messageContext", {
          pipe: message.context.pipe_id,
          segment: message.context.segment_id,
          date: format.date(message.context.target_date),
        })}{" "}
        {t(message.context.scope === "pipe" ? "assistant:pipeScope" : "assistant:segmentScope")}
      </p>
      <p className={styles.context}>
        {t("variants:baseline")}
        {": "}
        {message.context.comparison_date
          ? format.date(message.context.comparison_date)
          : t("variants:nominalBase")}
        {". "}
        {t("assistant:rangeValue", {
          from: format.integer(message.context.from_m ?? 0),
          to: format.integer(message.context.to_m ?? 0),
        })}
      </p>
    </>
  )
}
