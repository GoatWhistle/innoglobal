import { useQuery } from "@tanstack/react-query"
import {
  type ResearchArtifact as Artifact,
  loadResearchArtifact,
  loadResearchSeries,
} from "@/shared/api/assistant-artifact"
import { useTranslation } from "@/shared/i18n"
import { ArtifactTable } from "./artifact-table"
import styles from "./research-layout.module.css"

export function AssistantArtifact({ id }: { readonly id: string }) {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ["assistant-artifact", id],
    queryFn: ({ signal }) => loadResearchArtifact(id, signal),
  })
  if (query.isError) return <p role="alert">{t("assistant:error")}</p>
  if (!query.data) return <p role="status">{t("assistant:reading")}</p>
  const artifact = query.data
  if (artifact.kind === "dashboard")
    return (
      <section className={styles.layout}>
        <p>{artifact.title}</p>
        {artifact.artifact_ids?.map((ref) => (
          <AssistantArtifact key={ref} id={ref} />
        ))}
      </section>
    )
  if (artifact.kind === "chart" && artifact.data_ref)
    return (
      <section className={styles.layout}>
        <p>
          {artifact.x} / {artifact.y}
        </p>
        <ArtifactChart artifact={artifact} />
      </section>
    )
  return <ArtifactTable id={id} />
}

function ArtifactChart({ artifact }: { readonly artifact: Artifact }) {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ["artifact-series", artifact.data_ref],
    queryFn: ({ signal }) => loadResearchSeries(artifact.data_ref ?? "", signal),
  })
  if (query.isError) return <p role="alert">{t("assistant:error")}</p>
  if (!query.data) return <p role="status">{t("assistant:reading")}</p>
  const rows = query.data?.rows ?? []
  const points = rows
    .map((row) => {
      const raw = row[artifact.x ?? ""]
      const x =
        typeof raw === "number" || (typeof raw === "string" && /^-?\d+(\.\d+)?$/.test(raw))
          ? Number(raw)
          : Date.parse(String(raw))
      const y = row[artifact.y ?? ""]
      return { x, y: y === null || y === undefined ? Number.NaN : Number(y) }
    })
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const low = Math.min(...ys)
  const high = Math.max(...ys)
  const scaled = points.map((point) => ({
    x: 40 + ((point.x - left) / Math.max(right - left, 1)) * 550,
    y: 180 - ((point.y - low) / Math.max(high - low, 0.001)) * 150,
    value: point.y,
  }))
  const coordinates = scaled.map((point) => `${point.x},${point.y}`).join(" ")
  return (
    <>
      <svg
        className={styles.chart}
        viewBox="0 0 600 220"
        role="img"
        aria-label={`${artifact.x} / ${artifact.y}`}
      >
        {artifact.chart_kind === "scatter" ? (
          scaled.map((point, index) => (
            <circle key={String(index)} cx={point.x} cy={point.y} r="3" fill="currentColor">
              <title>{point.value}</title>
            </circle>
          ))
        ) : artifact.chart_kind === "bar" ? (
          scaled.map((point, index) => (
            <rect
              key={String(index)}
              x={point.x}
              y={point.y}
              width="3"
              height={180 - point.y}
              fill="currentColor"
            >
              <title>{point.value}</title>
            </rect>
          ))
        ) : (
          <polyline points={coordinates} fill="none" stroke="currentColor" />
        )}
        {points.length ? (
          <>
            <text x="0" y="30">
              {high}
            </text>
            <text x="0" y="180">
              {low}
            </text>
            <text x="40" y="210">
              {String(rows[0]?.[artifact.x ?? ""] ?? "")}
            </text>
            <text x="400" y="210">
              {String(rows.at(-1)?.[artifact.x ?? ""] ?? "")}
            </text>
          </>
        ) : null}
      </svg>
      <AssistantArtifact id={artifact.data_ref ?? ""} />
    </>
  )
}
