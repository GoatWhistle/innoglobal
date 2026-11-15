import type { Quality, QualityCheck } from "../reference.types"

export type CheckStatus = "failed" | "warning" | "info" | "passed"

export interface QualityVerdict {
  readonly required: number
  readonly requiredFailed: number
  readonly warnings: number
  readonly info: number
  readonly passed: number
  readonly total: number
  readonly quarantined: number
}

export interface PipeCoverage {
  readonly pipeId: number
  readonly runs: Quality["runs"]
  readonly features: number
  readonly minResidual: number | null
  readonly eligible: boolean
  readonly reason: string | null
  readonly regimeDays: number | null
}

export interface LayerSummary {
  readonly layer: string
  readonly tables: number
  readonly rows: number
}

const STATUS_ORDER: Readonly<Record<CheckStatus, number>> = {
  failed: 0,
  warning: 1,
  info: 2,
  passed: 3,
}

export function checkStatus(check: QualityCheck): CheckStatus {
  if (check.failed === 0) return "passed"
  if (check.severity === "error") return "failed"
  if (check.severity === "warn") return "warning"
  return "info"
}

export function failedShare(check: QualityCheck): number {
  return check.total === 0 ? 0 : check.failed / check.total
}

export function sortChecks(checks: readonly QualityCheck[]): QualityCheck[] {
  return [...checks].sort(
    (a, b) =>
      STATUS_ORDER[checkStatus(a)] - STATUS_ORDER[checkStatus(b)] ||
      failedShare(b) - failedShare(a) ||
      a.name.localeCompare(b.name),
  )
}

export function qualityVerdict(data: Quality): QualityVerdict {
  const statuses = data.checks.map(checkStatus)
  const count = (status: CheckStatus) => statuses.filter((item) => item === status).length
  return {
    required: data.checks.filter((check) => check.severity === "error").length,
    requiredFailed: count("failed"),
    warnings: count("warning"),
    info: count("info"),
    passed: count("passed"),
    total: data.checks.length,
    quarantined: data.quarantine.reduce((sum, row) => sum + row.rows, 0),
  }
}

export function tableRows(data: Quality, layer: string, table: string): number | undefined {
  return data.tables.find((item) => item.layer === layer && item.table === table)?.rows
}

export function pipeCoverage(data: Quality): PipeCoverage[] {
  const groups = new Map<number, Quality["runs"][number][]>()
  for (const run of data.runs) groups.set(run.pipe_id, [...(groups.get(run.pipe_id) ?? []), run])
  return [...groups.entries()].map(([pipeId, runs]) => {
    const sorted = [...runs].sort((a, b) => a.run_date.localeCompare(b.run_date))
    const latest = sorted[sorted.length - 1]
    const residuals = sorted.flatMap((run) =>
      run.min_residual_mm === null ? [] : [run.min_residual_mm],
    )
    return {
      pipeId,
      runs: sorted,
      features: latest?.n_features ?? 0,
      minResidual: residuals.length === 0 ? null : Math.min(...residuals),
      eligible: sorted.some((run) => run.is_training_eligible),
      reason: sorted.find((run) => run.exclusion_reason !== null)?.exclusion_reason ?? null,
      regimeDays: data.regime.find((item) => item.pipe_id === pipeId)?.days ?? null,
    }
  })
}

export function layerSummary(tables: Quality["tables"]): LayerSummary[] {
  const summary = new Map<string, LayerSummary>()
  for (const table of tables) {
    const current = summary.get(table.layer) ?? { layer: table.layer, tables: 0, rows: 0 }
    summary.set(table.layer, {
      layer: table.layer,
      tables: current.tables + 1,
      rows: current.rows + table.rows,
    })
  }
  return [...summary.values()]
}
