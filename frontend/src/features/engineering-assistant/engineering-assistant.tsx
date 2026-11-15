import { type ReactNode, useEffect, useRef, useState } from "react"
import { type AssistantAction, type AssistantMessage, useAssistant } from "@/entities/assistant"
import { type PipeSummary, type Profile, type SegmentRow, useThickness } from "@/entities/pipe"
import { useMediaQuery } from "@/shared/hooks"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { Button, Drawer, IconButton, ScrollArea, Segmented, Tabs } from "@/shared/ui"
import { AssistantAnswer } from "./assistant-answer"
import styles from "./engineering-assistant.module.css"

export interface EngineeringAssistantProps {
  readonly pipe: PipeSummary
  readonly profile: Profile
  readonly row: SegmentRow
  readonly date: string | undefined
  readonly range: { from: number; to: number }
  readonly data: ReactNode
  readonly onAction: (action: AssistantAction, message: AssistantMessage) => void
}
const PROMPTS = ["priority", "compare", "neighbors", "available"] as const
export function EngineeringAssistant(props: EngineeringAssistantProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const thickness = useThickness()
  const narrow = useMediaQuery("(width < 48rem)")
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"assistant" | "data">("assistant")
  const [scope, setScope] = useState<"segment" | "pipe">("segment")
  const [draft, setDraft] = useState("")
  const follow = useRef(true)
  const end = useRef<HTMLDivElement>(null)
  const { pipe, profile, row, date } = props
  const chat = useAssistant({
    pipe_id: pipe.pipe_id,
    segment_id: row.segment_id,
    snapshot_id: profile.snapshot_id,
    target_date: pipe.target_date,
    comparison_date: date ?? null,
    scope,
    from_m: props.range.from,
    to_m: props.range.to,
  })
  const last = row.observations.at(-1)
  const count = chat.messages.length
  const lastText = chat.messages.at(-1)?.text
  useEffect(() => {
    if (follow.current && (count || lastText))
      end.current?.parentElement?.scrollTo({ top: end.current.parentElement.scrollHeight })
  }, [count, lastText])
  const send = (text = draft) => {
    if (!text.trim() || chat.busy) return
    follow.current = true
    chat.send(text.trim())
    setDraft("")
  }
  const content = (
    <div className={styles.panel} data-expanded={open || narrow}>
      <div className={styles.facts}>
        <div className={styles.factHeading}>
          <strong>{t("inspector:title", { segment: row.segment_id })}</strong>
          <span>{thickness.range(row.start_m, row.end_m)}</span>
          {!narrow && !open ? (
            <IconButton icon="expand" label={t("assistant:expand")} onClick={() => setOpen(true)} />
          ) : null}
        </div>
        <div className={styles.forecast}>
          <strong data-testid="assistant-forecast">{thickness.withUnit(row.forecast_mm)}</strong>
          <span>{t("assistant:forecastDate", { date: format.date(pipe.target_date) })}</span>
        </div>
        <dl className={styles.factEvidence}>
          <div>
            <dt>{last ? format.date(last.run_date) : t("variants:lastVtd")}</dt>
            <dd>
              {last?.residual_mm == null
                ? t("variants:missing")
                : thickness.withUnit(last.residual_mm)}
            </dd>
          </div>
          <div>
            <dt>{t("inspector:interval")}</dt>
            <dd>
              {thickness.value(row.p10_mm)}
              {t("pipe:unit.span", { from: "", to: thickness.withUnit(row.p90_mm) })}
            </dd>
          </div>
          <div>
            <dt>{t("variants:queue")}</dt>
            <dd>{row.priority_rank ?? t("inspector:outside")}</dd>
          </div>
        </dl>
      </div>
      <Tabs
        label={t("assistant:panel")}
        value={tab}
        onChange={setTab}
        items={[
          { value: "assistant", label: t("assistant:title") },
          { value: "data", label: t("assistant:data") },
        ]}
      />
      <ScrollArea hidden={tab !== "data"} className={styles.data}>
        {props.data}
      </ScrollArea>
      <div hidden={tab !== "assistant"} className={styles.conversation}>
        <ScrollArea
          className={styles.messages}
          role="log"
          aria-label={t("assistant:conversation")}
          onScroll={(event) => {
            const e = event.currentTarget
            follow.current = e.scrollHeight - e.scrollTop - e.clientHeight < 80
          }}
        >
          <p className={styles.context}>
            {t("assistant:currentContext", {
              pipe: pipe.pipe_id,
              from: format.integer(row.start_m),
              to: format.integer(row.end_m),
              date: format.date(pipe.target_date),
            })}
          </p>
          <div className={styles.prompts}>
            {PROMPTS.map((key) => (
              <Button
                key={key}
                variant="secondary"
                size="compact"
                disabled={chat.busy}
                onClick={() => send(t(`assistant:prompts.${key}`))}
              >
                {t(`assistant:prompts.${key}`)}
              </Button>
            ))}
          </div>
          {chat.messages.map((message) => (
            <AssistantAnswer
              key={message.id}
              message={message}
              onAction={props.onAction}
              onRetry={() => chat.retry(message.id)}
            />
          ))}
          <div ref={end} />
        </ScrollArea>
        <form
          className={styles.composer}
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          <label htmlFor="assistant-input" className={styles.context}>
            {t("assistant:input")}
          </label>
          <textarea
            id="assistant-input"
            value={draft}
            maxLength={4000}
            rows={3}
            title={t("assistant:enter")}
            placeholder={t("assistant:placeholder")}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                send()
              }
            }}
          />
          <div className={styles.send}>
            <Segmented
              label={t("assistant:scope")}
              value={scope}
              onChange={setScope}
              options={[
                { value: "segment", label: t("assistant:segmentScope") },
                { value: "pipe", label: t("assistant:pipeScope") },
              ]}
            />

            {chat.busy ? (
              <Button variant="secondary" onClick={chat.stop}>
                {t("assistant:stop")}
              </Button>
            ) : (
              <Button type="submit" disabled={!draft.trim()}>
                {t("assistant:send")}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
  return narrow || open ? (
    <>
      {narrow ? (
        <Button variant="primary" onClick={() => setOpen(true)}>
          {t("assistant:open")}
        </Button>
      ) : null}
      <Drawer open={open} onClose={() => setOpen(false)} title={t("assistant:title")} size="wide">
        {content}
      </Drawer>
    </>
  ) : (
    content
  )
}
