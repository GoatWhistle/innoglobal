import { useState } from "react"
import type { AssistantAction, AssistantMessage } from "@/entities/assistant"
import { EngineeringAssistant } from "@/features/engineering-assistant"
import { SegmentFacts, type WorkspaceProps } from "@/features/engineering-variants"
import { useTranslation } from "@/shared/i18n"
import { Banner, Button, ButtonLink, Drawer } from "@/shared/ui"

export interface AssistantWorkspaceProps {
  readonly workspace: WorkspaceProps
  readonly date: string | undefined
  readonly onDate: (date: string) => void
  readonly onView: (view: "route" | "unroll" | "section") => void
  readonly onHighlight: (ids: number[]) => void
}
export function AssistantWorkspace({
  workspace: w,
  date,
  onDate,
  onView,
  onHighlight,
}: AssistantWorkspaceProps) {
  const { t } = useTranslation()
  const [source, setSource] = useState<{
    action: AssistantAction
    message: AssistantMessage
  } | null>(null)
  const [error, setError] = useState(false)
  const act = (action: AssistantAction, message: AssistantMessage) => {
    const ids = action.segment_ids ?? []
    const valid = validContext(message, w, ids)
    if (!valid) {
      setError(true)
      return
    }
    setError(false)
    if (action.kind === "select") w.onSelect(ids[0] as number)
    if (action.kind === "view") onView(action.view as "route" | "unroll" | "section")
    if (action.kind === "source") setSource({ action, message })
    if (validComparison(action, w.profile.run_dates)) onDate(String(action.date))
    if (action.kind === "priorities")
      onHighlight(
        w.profile.rows.filter((row) => row.priority_rank !== null).map((row) => row.segment_id),
      )
    if (validRange(action, w.pipe.passport.length_m)) {
      w.onRange({ from: Number(action.from_m), to: Number(action.to_m) })
      onHighlight(ids)
    }
  }
  const sourceId = source?.action.segment_ids?.[0] ?? source?.message.context.segment_id
  const sourceRow = w.profile.rows.find((row) => row.segment_id === sourceId) ?? w.row
  return (
    <>
      {error ? <Banner tone="warning" title={t("assistant:actionError")} /> : null}
      <EngineeringAssistant
        pipe={w.pipe}
        profile={w.profile}
        row={w.row}
        date={date}
        range={w.range}
        onAction={act}
        data={<SegmentFacts {...w} comparisonDate={date ?? null} detailsOnly />}
      />
      <Drawer
        open={source !== null}
        onClose={() => setSource(null)}
        title={t("assistant:sourceTitle")}
      >
        {source?.action.source === "ranking" ? (
          <p>{t("assistant:ranking")}</p>
        ) : source?.action.source === "model" ? (
          <ButtonLink to="/model">{t("variants:modelExplanation")}</ButtonLink>
        ) : (
          <SegmentFacts
            {...w}
            row={sourceRow}
            comparisonDate={source?.message.context.comparison_date ?? null}
          />
        )}
        <Button
          variant="secondary"
          onClick={() => {
            w.onSelect(sourceRow.segment_id)
            setSource(null)
          }}
        >
          {t("assistant:actions.select", { segment: sourceRow.segment_id })}
        </Button>
      </Drawer>
    </>
  )
}

function validRange(action: AssistantAction, length: number) {
  return (
    action.kind === "range" &&
    action.from_m != null &&
    action.to_m != null &&
    Number.isFinite(action.from_m) &&
    Number.isFinite(action.to_m) &&
    action.from_m >= 0 &&
    action.from_m < action.to_m &&
    action.to_m <= length
  )
}

function validContext(message: AssistantMessage, w: WorkspaceProps, ids: number[]) {
  return (
    message.context.pipe_id === w.pipe.pipe_id &&
    message.context.snapshot_id === w.profile.snapshot_id &&
    ids.every((id) => w.profile.rows.some((row) => row.segment_id === id))
  )
}
function validComparison(action: AssistantAction, dates: readonly string[]) {
  return action.kind === "compare" && action.date != null && dates.includes(action.date)
}
