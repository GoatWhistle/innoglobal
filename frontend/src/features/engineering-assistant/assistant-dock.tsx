import { useEffect, useRef, useState } from "react"
import { type AssistantAction, type AssistantMessage, useAssistant } from "@/entities/assistant"
import type { PipeSummary, Profile, SegmentRow } from "@/entities/pipe"
import { useTranslation } from "@/shared/i18n"
import { Button, Card, CloseButton, IconButton, ScrollArea, Select } from "@/shared/ui"
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
  const [scope, setScope] = useState<"segment" | "pipe">("segment")
  const [width, setWidth] = useState(320)
  const end = useRef<HTMLDivElement>(null)
  const chat = useAssistant({
    pipe_id: pipe.pipe_id,
    segment_id: row.segment_id,
    snapshot_id: profile.snapshot_id,
    target_date: pipe.target_date,
    scope,
    comparison_date: pipe.last_observed_run,
    from_m: row.start_m,
    to_m: row.end_m,
  })
  const last = chat.messages.at(-1)?.text
  useEffect(() => {
    if (last) end.current?.scrollIntoView({ block: "nearest" })
  }, [last])
  const send = (value = draft) => {
    if (!value.trim() || chat.busy) return
    chat.send(value.trim())
    setDraft("")
  }
  return (
    <aside hidden={hidden} className={styles.dock} data-side={side} style={{ flexBasis: width }}>
      <hr
        className={styles.resize}
        tabIndex={0}
        aria-label={t("variants:workspace.resizeChat")}
        aria-orientation="vertical"
        aria-valuemin={280}
        aria-valuemax={480}
        aria-valuenow={width}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault()
            setWidth((w) =>
              Math.max(
                280,
                Math.min(480, w + (e.key === "ArrowLeft" ? 24 : -24) * (side === "right" ? 1 : -1)),
              ),
            )
          }
        }}
        onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            setWidth((w) =>
              Math.max(280, Math.min(480, w + e.movementX * (side === "right" ? -1 : 1))),
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
      <p className={styles.context}>
        {t("inspector:title", { segment: row.segment_id })} ·{" "}
        {t("pipe:unit.range", { from: row.start_m, to: row.end_m })}
      </p>
      <ScrollArea className={styles.messages} role="log" aria-label={t("assistant:conversation")}>
        {!chat.messages.length ? (
          <>
            <Card appearance="plain" title={t("variants:workspace.ask")}>
              {null}
            </Card>
            {(["priority", "compare", "neighbors"] as const).map((key) => (
              <Button key={key} variant="quiet" onClick={() => send(t(`assistant:prompts.${key}`))}>
                {t(`assistant:prompts.${key}`)}
              </Button>
            ))}
          </>
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
        <textarea
          className={styles.input}
          aria-label={t("assistant:input")}
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
        <div>
          <Select
            label={t("assistant:scope")}
            value={scope}
            onChange={(v) => setScope(v === "pipe" ? "pipe" : "segment")}
            options={[
              { value: "segment", label: t("assistant:segmentScope") },
              { value: "pipe", label: t("assistant:pipeScope") },
            ]}
          />
          {chat.busy ? (
            <Button onClick={chat.stop}>{t("assistant:stop")}</Button>
          ) : (
            <Button type="submit" disabled={!draft.trim()}>
              {t("assistant:send")}
            </Button>
          )}
        </div>
        <small>{t("variants:workspace.fallback")}</small>
      </form>
    </aside>
  )
}
