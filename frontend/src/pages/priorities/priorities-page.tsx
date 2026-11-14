import { useNavigate, useParams } from "react-router"
import { CASE_TITLE, usePipes, usePriorities } from "@/entities/pipe"
import { PipeSwitch } from "@/features/pipe-switch"
import { PriorityTable } from "@/features/priority-table"
import { useDocumentTitle, useFormatters, useTranslation } from "@/shared/i18n"
import { ButtonAnchor, ButtonLink, Card, PageHeader, QueryView, Skeleton } from "@/shared/ui"
import styles from "./priorities-page.module.css"

export function PrioritiesPage() {
  const { t } = useTranslation()
  const format = useFormatters()
  const navigate = useNavigate()
  const params = useParams()
  const pipeId = Number(params.pipeId)
  const pipes = usePipes()
  const priorities = usePriorities(pipeId)
  const pipe = pipes.data?.items.find((item) => item.pipe_id === pipeId)
  useDocumentTitle(t("priorities:pageTitle", { pipe: params.pipeId ?? "" }))
  const latest = pipe?.runs.filter((run) => run.is_training_eligible).at(-1)?.run_date ?? null
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={pipe === undefined ? undefined : t(CASE_TITLE[pipe.mode])}
        title={t("priorities:title", { pipe: params.pipeId ?? "" })}
        description={
          pipe === undefined
            ? undefined
            : t("priorities:rule", {
                percent: pipe.priority_percent,
                count: pipe.priority_count,
                total: format.integer(pipe.segments),
                date: format.date(pipe.target_date),
              })
        }
        actions={
          pipes.data === undefined ? undefined : (
            <>
              <PipeSwitch
                pipes={pipes.data.items}
                current={pipeId}
                onChange={(id) => {
                  void navigate(`/pipes/${id}/priorities`, { viewTransition: true })
                }}
              />
              <ButtonAnchor
                href={`/api/v1/pipes/${pipeId}/priorities.csv`}
                download={`duppel-priorities-${pipeId}.csv`}
                icon="download"
              >
                {t("priorities:export")}
              </ButtonAnchor>
            </>
          )
        }
      />
      <ul className={styles.facts}>
        <li>{t("priorities:fact.order")}</li>
        <li>{t("priorities:fact.notDiagnosis")}</li>
        <li>{t("priorities:fact.tie")}</li>
      </ul>
      <Card
        title={t("priorities:tableTitle")}
        actions={
          <ButtonLink to={`/pipes/${pipeId}`} variant="quiet" size="compact" icon="pipe">
            {t("priorities:toPipe")}
          </ButtonLink>
        }
      >
        <QueryView
          query={priorities}
          label={t("priorities:loading")}
          skeleton={<Skeleton lines={10} />}
        >
          {(data) => (
            <PriorityTable
              pipeId={pipeId}
              rows={data.items}
              lengthM={pipe?.passport.length_m ?? data.items.at(-1)?.end_m ?? 0}
              latestRun={latest}
            />
          )}
        </QueryView>
      </Card>
    </div>
  )
}
