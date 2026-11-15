import { useSearchParams } from "react-router"
import { type PipeList, type PipeSummary, usePipes, useProfile } from "@/entities/pipe"
import { useDocumentTitle, useTranslation } from "@/shared/i18n"
import { Banner, ButtonLink, EmptyState, QueryView, Skeleton } from "@/shared/ui"
import { PipelineFleet } from "./pipeline-fleet"
import { VariantsWorkspace } from "./variants-workspace"

function ProfileLoader({
  pipe,
  pipes,
  invalid,
}: {
  readonly pipe: PipeSummary
  readonly pipes: PipeList
  readonly invalid: boolean
}) {
  const profile = useProfile(pipe.pipe_id)
  const { t } = useTranslation()
  return (
    <>
      {invalid ? <Banner tone="warning" title={t("variants:invalidPipe")} /> : null}
      <QueryView
        query={profile}
        label={t("variants:loading")}
        skeleton={<Skeleton shape="block" />}
      >
        {(data) =>
          data.rows.length ? (
            <VariantsWorkspace key={pipe.pipe_id} pipe={pipe} pipes={pipes} profile={data} />
          ) : (
            <EmptyState
              icon="pipe"
              title={t("variants:empty")}
              description={t("variants:emptyBody")}
              action={
                <ButtonLink to="/" icon="pipe">
                  {t("variants:product")}
                </ButtonLink>
              }
            />
          )
        }
      </QueryView>
    </>
  )
}
export function DesignVariantsPage() {
  const { t } = useTranslation()
  const [search] = useSearchParams()
  const pipes = usePipes()
  const requested = Number(search.get("pipe"))
  useDocumentTitle(t("variants:names.inspection"))
  return (
    <QueryView query={pipes} label={t("variants:loading")} skeleton={<Skeleton shape="block" />}>
      {(data) => {
        if (!search.has("pipe")) return <PipelineFleet pipes={data} />
        const match = data.items.find((item) => item.pipe_id === requested)
        const pipe = match ?? data.items[0]
        return pipe ? (
          <ProfileLoader pipe={pipe} pipes={data} invalid={search.has("pipe") && !match} />
        ) : (
          <EmptyState
            icon="pipe"
            title={t("variants:empty")}
            description={t("variants:emptyBody")}
            action={
              <ButtonLink to="/" icon="pipe">
                {t("variants:product")}
              </ButtonLink>
            }
          />
        )
      }}
    </QueryView>
  )
}
