import { useNavigate, useParams } from "react-router"
import { CASE_TITLE, usePipes, useProfile } from "@/entities/pipe"
import { PipeSwitch } from "@/features/pipe-switch"
import { useDocumentTitle, useTranslation } from "@/shared/i18n"
import { ButtonAnchor, ButtonLink, EmptyState, PageHeader, QueryView, Skeleton } from "@/shared/ui"
import styles from "./pipe-page.module.css"
import { PipeWorkspace } from "./pipe-workspace"

export function PipePage() {
  const { t } = useTranslation()
  const params = useParams()
  const navigate = useNavigate()
  const pipeId = Number(params.pipeId)
  const pipes = usePipes()
  const profile = useProfile(pipeId)
  const pipe = pipes.data?.items.find((item) => item.pipe_id === pipeId)
  useDocumentTitle(t("pipe:pageTitle", { pipe: params.pipeId ?? "" }))

  if (pipes.data !== undefined && pipe === undefined) {
    return (
      <EmptyState
        icon="search"
        title={t("pipe:unknown.title")}
        description={t("pipe:unknown.description", { pipe: params.pipeId ?? "" })}
        action={
          <ButtonLink to="/" icon="arrow-left">
            {t("pipe:unknown.back")}
          </ButtonLink>
        }
      />
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={pipe === undefined ? undefined : t(CASE_TITLE[pipe.mode])}
        title={t("pipe:title", { pipe: params.pipeId ?? "" })}
        description={
          pipe === undefined
            ? undefined
            : t("pipe:subtitle", {
                direction: pipe.passport.direction,
                section: pipe.passport.section_name,
              })
        }
        actions={
          pipes.data === undefined ? undefined : (
            <>
              <PipeSwitch
                pipes={pipes.data.items}
                current={pipeId}
                onChange={(id) => {
                  void navigate(`/pipes/${id}`, { viewTransition: true })
                }}
              />
              <ButtonLink to={`/pipes/${pipeId}/priorities`} variant="secondary" icon="warning">
                {t("pipe:toPriorities")}
              </ButtonLink>
              <ButtonAnchor href="/api/v1/exports/result.csv" download="result.csv" icon="download">
                {t("pipe:exportResult")}
              </ButtonAnchor>
            </>
          )
        }
      />
      {pipes.isError && pipes.data === undefined ? (
        <QueryView query={pipes} label={t("pipe:loading")} skeleton={null}>
          {() => null}
        </QueryView>
      ) : null}
      <QueryView
        query={profile}
        label={t("pipe:loading")}
        skeleton={
          <div className={styles.skeleton}>
            <Skeleton shape="block" />
            <Skeleton shape="block" />
          </div>
        }
      >
        {(data) =>
          pipe === undefined ? null : (
            <PipeWorkspace key={pipe.pipe_id} pipe={pipe} profile={data} />
          )
        }
      </QueryView>
    </div>
  )
}
