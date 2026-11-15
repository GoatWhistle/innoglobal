import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import type { AssistantAction, AssistantMessage } from "@/entities/assistant"
import { type PipeList, type PipeSummary, usePipes, useProfile } from "@/entities/pipe"
import { AssistantChat } from "@/features/engineering-assistant"
import { useDocumentTitle, useTranslation } from "@/shared/i18n"
import { Banner, QueryView, Select, Skeleton } from "@/shared/ui"

export function AssistantPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const pipes = usePipes()
  useDocumentTitle(t("common:nav.assistant"))
  return (
    <QueryView query={pipes} label={t("variants:loading")} skeleton={<Skeleton shape="block" />}>
      {(data) => {
        const pipe =
          data.items.find((item) => item.pipe_id === Number(params.get("pipe"))) ?? data.items[0]
        return pipe ? (
          <PipeChat key={pipe.pipe_id} pipe={pipe} pipes={data} />
        ) : (
          <Banner tone="warning" title={t("variants:empty")} />
        )
      }}
    </QueryView>
  )
}

function PipeChat({ pipe, pipes }: { readonly pipe: PipeSummary; readonly pipes: PipeList }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [, setParams] = useSearchParams()
  const [session, setSession] = useState(0)
  const profile = useProfile(pipe.pipe_id)
  const act = (action: AssistantAction, message: AssistantMessage) => {
    if (action.kind === "source" && action.source === "model") {
      navigate("/model")
      return
    }
    const next = new URLSearchParams({
      pipe: String(message.context.pipe_id),
      segment: String(action.segment_ids?.[0] ?? message.context.segment_id),
    })
    if (action.kind === "view" && action.view === "unroll") next.set("view", "unroll")
    navigate(`/?${next}`)
  }
  return (
    <QueryView query={profile} label={t("variants:loading")} skeleton={<Skeleton shape="block" />}>
      {(data) => {
        const row =
          data.rows.find((item) => item.priority_rank === 1) ??
          data.rows.find((item) => item.segment_id === pipe.thinnest_segment_id) ??
          data.rows[0]
        return row ? (
          <AssistantChat
            key={session}
            pipe={pipe}
            profile={data}
            row={row}
            onAction={act}
            onReset={() => setSession((value) => value + 1)}
            toolbar={
              <Select
                label={t("assistant:page.pipe")}
                value={String(pipe.pipe_id)}
                onChange={(value) => setParams({ pipe: value })}
                options={pipes.items.map((item) => ({
                  value: String(item.pipe_id),
                  label: item.passport.direction,
                }))}
              />
            }
          />
        ) : (
          <Banner tone="warning" title={t("variants:empty")} />
        )
      }}
    </QueryView>
  )
}
