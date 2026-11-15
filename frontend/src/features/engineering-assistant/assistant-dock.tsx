import { useEffect, useRef, useState } from "react"
import { type AssistantAction, type AssistantMessage, useAssistant } from "@/entities/assistant"
import type { PipeSummary, Profile, SegmentRow } from "@/entities/pipe"
import { useTranslation } from "@/shared/i18n"
import { Button, Card, CloseButton, IconButton, ScrollArea } from "@/shared/ui"
import { AssistantAnswer } from "./assistant-answer"
import styles from "./assistant-dock.module.css"

export function AssistantDock({
  pipe,
  profile,
  row,
  hidden,
  side,
  onSide,
  onClose,
  onMinimize,
  onAction,
}: {
  readonly pipe: PipeSummary
  readonly profile: Profile
  readonly row: SegmentRow
  readonly hidden: boolean
  readonly side: "left" | "right"
  readonly onSide: (side: "left" | "right") => void
  readonly onClose: () => void
  readonly onMinimize: () => void
  readonly onAction: (action: AssistantAction, message: AssistantMessage) => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState("")
  const [width, setWidth] = useState(384)
  const end = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLElement>(null)
  const follow = useRef(true)
  const chat = useAssistant({
    pipe_id: pipe.pipe_id,
    segment_id: row.segment_id,
    snapshot_id: profile.snapshot_id,
    target_date: pipe.target_date,
    scope: "pipe",
    comparison_date: pipe.last_observed_run,
    from_m: row.start_m,
    to_m: row.end_m,
  })
  const last = chat.messages.at(-1)?.text
  const count = chat.messages.length
  const status = chat.messages.at(-1)?.status
  useEffect(() => {
    if (follow.current && (count || last || status)) {
      const log = end.current?.parentElement
      log?.scrollTo({ top: log.scrollHeight })
    }
  }, [last, count, status])
  useEffect(() => {
    if (!hidden) panel.current?.scrollIntoView({ block: "nearest" })
  }, [hidden])
  const send = (value = draft) => {
    if (!value.trim() || chat.busy) return
    follow.current = true
    chat.send(value.trim())
    setDraft("")
  }
  return (
    <aside
      ref={panel}
      hidden={hidden}
      className={styles.dock}
      data-side={side}
      style={{ flexBasis: width }}
      aria-label={t("assistant:title")}
    >
      <hr
        className={styles.resize}
        tabIndex={0}
        aria-label={t("variants:workspace.resizeChat")}
        aria-orientation="vertical"
        aria-valuemin={320}
        aria-valuemax={480}
        aria-valuenow={width}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault()
            setWidth((w) =>
              Math.max(
                320,
                Math.min(480, w + (e.key === "ArrowLeft" ? 24 : -24) * (side === "right" ? 1 : -1)),
              ),
            )
          }
        }}
        onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            setWidth((w) =>
              Math.max(320, Math.min(480, w + e.movementX * (side === "right" ? -1 : 1))),
            )
        }}
      />
      <header
        className={styles.header}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            onSide(e.clientX < window.innerWidth / 2 ? "left" : "right")
            e.currentTarget.releasePointerCapture(e.pointerId)
          }
        }}
      >
        <strong>{t("assistant:title")}</strong>
        <IconButton
          icon="drag"
          label={t("variants:workspace.moveChat")}
          onClick={() => onSide(side === "left" ? "right" : "left")}
        />
        <IconButton
          icon="minus"
          label={t("variants:workspace.minimizeChat")}
          onClick={onMinimize}
        />
        <CloseButton onClick={onClose} />
      </header>
      <div className={styles.context}>
        <strong>{pipe.passport.direction}</strong>
        <span>
          {t("inspector:title", { segment: row.segment_id })} ·{" "}
          {t("pipe:unit.range", { from: row.start_m, to: row.end_m })}
        </span>
      </div>
      <ScrollArea
        className={styles.messages}
        role="log"
        aria-label={t("assistant:conversation")}
        onScroll={(event) => {
          const log = event.currentTarget
          follow.current = log.scrollHeight - log.scrollTop - log.clientHeight < 80
        }}
      >
        {!chat.messages.length ? (
          <Card appearance="plain" className={styles.empty} title={t("assistant:welcome")}>
            <p>{t("assistant:welcomeDescription")}</p>
          </Card>
        ) : null}
        {chat.messages.map((message) => (
          <AssistantAnswer
            key={message.id}
            message={message}
            onAction={onAction}
            onRetry={() => chat.retry(message.id)}
          />
        ))}
        <div ref={end} />
      </ScrollArea>
      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <label className={styles.label} htmlFor="dock-question">
          {t("assistant:input")}
        </label>
        <textarea
          id="dock-question"
          className={styles.input}
          placeholder={t("assistant:placeholder")}
          rows={3}
          value={draft}
          maxLength={4000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send()
            }
          }}
        />
        <div className={styles.send}>
          <small role="status">{t(chat.busy ? "assistant:reading" : "assistant:enter")}</small>
          {chat.busy ? (
            <Button variant="secondary" onClick={chat.stop}>
              {t("assistant:stop")}
            </Button>
          ) : (
            <Button type="submit" icon="arrow-right" disabled={!draft.trim()}>
              {t("assistant:send")}
            </Button>
          )}
        </div>
        <p className={styles.note}>{t("variants:workspace.fallback")}</p>
      </form>
    </aside>
  )
}
