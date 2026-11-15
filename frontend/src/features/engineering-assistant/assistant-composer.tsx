import { useId, useState } from "react"
import { useTranslation } from "@/shared/i18n"
import { Button, IconButton } from "@/shared/ui"
import styles from "./assistant-chat.module.css"

export interface AssistantComposerProps {
  readonly busy: boolean
  readonly onSend: (text: string) => void
  readonly onStop: () => void
}

export function AssistantComposer({ busy, onSend, onStop }: AssistantComposerProps) {
  const { t } = useTranslation()
  const id = useId()
  const [draft, setDraft] = useState("")
  const send = () => {
    if (!draft.trim() || busy) return
    onSend(draft)
    setDraft("")
  }
  return (
    <form
      className={styles.composer}
      onSubmit={(event) => {
        event.preventDefault()
        send()
      }}
    >
      <div className={styles.composerBox}>
        <label className="visually-hidden" htmlFor={id}>
          {t("assistant:input")}
        </label>
        <textarea
          id={id}
          className={styles.input}
          placeholder={t("assistant:placeholder")}
          rows={2}
          value={draft}
          maxLength={4000}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              send()
            }
          }}
        />
        <div className={styles.send}>
          {busy ? (
            <Button variant="secondary" size="compact" onClick={onStop}>
              {t("assistant:stop")}
            </Button>
          ) : (
            <IconButton
              type="submit"
              icon="arrow-right"
              label={t("assistant:send")}
              disabled={!draft.trim()}
            />
          )}
        </div>
      </div>
      <small role="status" className={styles.hint}>
        {t(busy ? "assistant:reading" : "assistant:enter")}
      </small>
    </form>
  )
}
