import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router"
import {
  loadDashboards,
  loadDashboardVersions,
  loadResearchArtifact,
  refreshDashboard,
} from "@/shared/api/assistant-artifact"
import { useTranslation } from "@/shared/i18n"
import { Button, ButtonLink, PageHeader } from "@/shared/ui"
import { AssistantArtifact } from "./assistant-artifact"
import styles from "./research-layout.module.css"

export function DashboardLibrary() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const cache = useQueryClient()
  const list = useQuery({
    queryKey: ["dashboards"],
    queryFn: ({ signal }) => loadDashboards(signal),
  })
  const selected = useQuery({
    queryKey: ["assistant-artifact", id],
    enabled: Boolean(id),
    queryFn: ({ signal }) => loadResearchArtifact(id ?? "", signal),
  })
  const versions = useQuery({
    queryKey: ["dashboard-versions", id],
    enabled: Boolean(id),
    queryFn: ({ signal }) => loadDashboardVersions(id ?? "", signal),
  })
  const refresh = useMutation({
    mutationFn: refreshDashboard,
    onSuccess: (artifact) => {
      void cache.invalidateQueries({ queryKey: ["dashboards"] })
      void navigate(`/dashboards/${artifact.artifact_id}`)
    },
  })
  return (
    <main className={styles.layout}>
      <PageHeader title={t("assistant:dashboards")} />
      {list.isError || selected.isError || refresh.isError ? (
        <p role="alert">{t("assistant:error")}</p>
      ) : null}
      <nav className={styles.controls} aria-label={t("assistant:dashboards")}>
        {list.data?.map((dashboard) => (
          <ButtonLink
            variant="secondary"
            key={dashboard.artifact_id}
            to={`/dashboards/${dashboard.artifact_id}`}
          >
            {dashboard.title ?? dashboard.artifact_id}
          </ButtonLink>
        ))}
      </nav>
      {list.data?.length === 0 ? <p>{t("assistant:emptyDashboards")}</p> : null}
      <nav className={styles.controls} aria-label={t("assistant:previousVersion")}>
        {versions.data?.map((version) => (
          <ButtonLink
            variant="secondary"
            key={version.artifact_id}
            to={`/dashboards/${version.artifact_id}`}
          >
            {t("assistant:version", { version: version.version })}
          </ButtonLink>
        ))}
      </nav>
      {id && selected.data ? (
        <section className={styles.layout}>
          <p>{t("assistant:version", { version: selected.data.version })}</p>
          <div className={styles.controls}>
            <Button
              variant="secondary"
              disabled={refresh.isPending}
              onClick={() => refresh.mutate(id)}
            >
              {t("assistant:refreshDashboard")}
            </Button>
            {selected.data.previous_artifact_id ? (
              <ButtonLink
                variant="secondary"
                to={`/dashboards/${selected.data.previous_artifact_id}`}
              >
                {t("assistant:previousVersion")}
              </ButtonLink>
            ) : null}
          </div>
          <AssistantArtifact key={id} id={id} />
        </section>
      ) : null}
    </main>
  )
}
