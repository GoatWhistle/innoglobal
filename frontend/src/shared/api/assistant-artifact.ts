export interface ResearchArtifact {
  readonly artifact_id: string
  readonly kind: string
  readonly version?: number
  readonly previous_artifact_id?: string
  readonly created_at?: string
  readonly title?: string
  readonly columns?: string[]
  readonly rows?: Record<string, unknown>[]
  readonly data_ref?: string
  readonly artifact_ids?: string[]
  readonly chart_kind?: string
  readonly x?: string
  readonly y?: string
}

export async function loadResearchArtifact(
  id: string,
  signal: AbortSignal,
): Promise<ResearchArtifact> {
  const response = await fetch(`/api/v1/assistant/artifacts/${encodeURIComponent(id)}`, { signal })
  if (!response.ok) throw new Error("artifact_unavailable")
  return response.json() as Promise<ResearchArtifact>
}

export interface ArtifactRows {
  readonly columns: string[]
  readonly items: Record<string, unknown>[]
  readonly total: number
  readonly offset: number
  readonly limit: number
}

export async function loadArtifactRows(
  id: string,
  offset: number,
  signal: AbortSignal,
): Promise<ArtifactRows> {
  const response = await fetch(
    `/api/v1/assistant/artifacts/${encodeURIComponent(id)}/rows?offset=${offset}&limit=100`,
    { signal },
  )
  if (!response.ok) throw new Error("artifact_unavailable")
  return response.json() as Promise<ArtifactRows>
}

export async function loadDashboards(signal: AbortSignal): Promise<ResearchArtifact[]> {
  const response = await fetch("/api/v1/assistant/dashboards", { signal })
  if (!response.ok) throw new Error("artifact_unavailable")
  return response.json() as Promise<ResearchArtifact[]>
}

export async function refreshDashboard(id: string): Promise<ResearchArtifact> {
  const response = await fetch(`/api/v1/assistant/dashboards/${encodeURIComponent(id)}/refresh`, {
    method: "POST",
  })
  if (!response.ok) throw new Error("dashboard_refresh_failed")
  return response.json() as Promise<ResearchArtifact>
}

export async function loadDashboardVersions(
  id: string,
  signal: AbortSignal,
): Promise<ResearchArtifact[]> {
  const response = await fetch(`/api/v1/assistant/dashboards/${encodeURIComponent(id)}/versions`, {
    signal,
  })
  if (!response.ok) throw new Error("artifact_unavailable")
  return response.json() as Promise<ResearchArtifact[]>
}

export async function loadResearchSeries(
  id: string,
  signal: AbortSignal,
): Promise<ResearchArtifact> {
  const response = await fetch(
    `/api/v1/assistant/artifacts/${encodeURIComponent(id)}?include_rows=true`,
    { signal },
  )
  if (!response.ok) throw new Error("artifact_unavailable")
  return response.json() as Promise<ResearchArtifact>
}
