import { type ReactNode, useEffect, useRef, useState } from "react"
import { type AssistantAction, type AssistantMessage, useAssistant } from "@/entities/assistant"
import type { PipeSummary, Profile, SegmentRow } from "@/entities/pipe"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { Button, Segmented } from "@/shared/ui"
import { AssistantAnswer } from "./assistant-answer"
import styles from "./assistant-chat.module.css"
import { AssistantComposer } from "./assistant-composer"
import { AssistantEmpty } from "./assistant-empty"

export interface AssistantChatProps {
  readonly pipe: PipeSummary
  readonly profile: Profile
  readonly row: SegmentRow
  readonly toolbar: ReactNode
  readonly onReset: () => void
  readonly onAction: (action: AssistantAction, message: AssistantMessage) => void
}

const FOLLOW_UPS = ["compare", "neighbors", "available"] as const

function nearBottom() {
  const root = document.documentElement
  return root.scrollHeight - window.scrollY - window.innerHeight < 160
}

export function AssistantChat({
  pipe,
  profile,
  row,
  toolbar,
  onReset,
  onAction,
}: AssistantChatProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const [scope, setScope] = useState<"segment" | "pipe">("segment")
  const follow = useRef(true)
  const end = useRef<HTMLDivElement>(null)
  const chat = useAssistant({
    pipe_id: pipe.pipe_id,
    segment_id: row.segment_id,
    snapshot_id: profile.snapshot_id,
    target_date: pipe.target_date,
    comparison_date: pipe.last_observed_run,
    scope,
    from_m: scope === "segment" ? row.start_m : 0,
    to_m: scope === "segment" ? row.end_m : pipe.passport.length_m,
  })
  const count = chat.messages.length
  const tail = chat.messages.at(-1)
  useEffect(() => {
    const track = () => {
      follow.current = nearBottom()
    }
    window.addEventListener("scroll", track, { passive: true })
    return () => window.removeEventListener("scroll", track)
  }, [])
  useEffect(() => {
    if (follow.current && (count || tail?.text || tail?.status))
      end.current?.scrollIntoView({ block: "end" })
  }, [count, tail?.text, tail?.status])
  const send = (text: string) => {
    if (!text.trim() || chat.busy) return
    follow.current = true
    chat.send(text.trim())
  }
  return (
    <section className={styles.chat} aria-label={t("assistant:title")}>
      <div className={styles.bar}>
        <div className={styles.barInner}>
          {toolbar}
          <Segmented
            label={t("assistant:scope")}
            value={scope}
            onChange={setScope}
            options={[
              { value: "segment", label: t("assistant:segmentScope") },
              { value: "pipe", label: t("assistant:pipeScope") },
            ]}
          />
          {count ? (
            <Button variant="quiet" icon="plus" disabled={chat.busy} onClick={onReset}>
              {t("assistant:page.newChat")}
            </Button>
          ) : null}
        </div>
      </div>
      <div className={styles.log} role="log" aria-label={t("assistant:conversation")}>
        {count ? null : (
          <AssistantEmpty
            context={
              scope === "segment"
                ? t("assistant:currentContext", {
                    pipe: pipe.passport.direction,
                    from: format.integer(row.start_m),
                    to: format.integer(row.end_m),
                    date: format.date(pipe.target_date),
                  })
                : t("assistant:page.pipeContext", {
                    pipe: pipe.passport.direction,
                    date: format.date(pipe.target_date),
                  })
            }
            disabled={chat.busy}
            onAsk={send}
          />
        )}
        {chat.messages.map((message) => (
          <AssistantAnswer
            key={message.id}
            message={message}
            onAction={onAction}
            onRetry={() => chat.retry(message.id)}
          />
        ))}
        {count && !chat.busy && tail?.status === "done" ? (
          <div className={styles.followUps}>
            <span>{t("assistant:page.followUps")}</span>
            <div>
              {FOLLOW_UPS.map((key) => (
                <Button
                  key={key}
                  variant="secondary"
                  size="compact"
                  onClick={() => send(t(`assistant:prompts.${key}`))}
                >
                  {t(`assistant:prompts.${key}`)}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        <div ref={end} />
      </div>
      <AssistantComposer busy={chat.busy} onSend={send} onStop={chat.stop} />
    </section>
  )
}
