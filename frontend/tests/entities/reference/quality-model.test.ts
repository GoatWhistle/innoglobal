import { describe, expect, it } from "vitest"
import type { Quality } from "@/entities/reference"
import {
  layerSummary,
  pipeCoverage,
  qualityVerdict,
  sortChecks,
} from "@/entities/reference/quality-tables/quality-model"

const run = (pipe_id: number, run_date: string, eligible: boolean, residual: number | null) => ({
  pipe_id,
  run_date,
  n_features: run_date.length,
  n_metal_loss: 0,
  wall_mode_mm: 8,
  min_residual_mm: residual,
  is_training_eligible: eligible,
  exclusion_reason: eligible ? null : "run predates commissioning: replaced pipe",
})

const quality: Quality = {
  snapshot_id: "s",
  checked_at: null,
  checks: [
    { name: "a.ok", severity: "error", failed: 0, total: 10, description: null },
    { name: "b.warn", severity: "warn", failed: 1, total: 10, description: null },
    { name: "c.err", severity: "error", failed: 2, total: 4, description: null },
    { name: "d.info", severity: "info", failed: 5, total: 5, description: null },
  ],
  quarantine: [
    { table: "t", reason: "duplicate", rows: 3 },
    { table: "u", reason: "duplicate", rows: 4 },
  ],
  tables: [
    { layer: "raw", table: "x", rows: 10 },
    { layer: "raw", table: "y", rows: 5 },
    { layer: "core", table: "pipe", rows: 2 },
  ],
  regime: [{ pipe_id: 1, first_day: "2020-01-01", last_day: "2020-02-01", days: 31 }],
  runs: [
    run(1, "2022-01-01", true, 4.2),
    run(1, "2018-01-01", true, 3.1),
    run(2, "2014-01-01", false, null),
  ],
}

describe("quality model", () => {
  it("counts the verdict by status", () => {
    expect(qualityVerdict(quality)).toEqual({
      required: 2,
      requiredFailed: 1,
      warnings: 1,
      info: 1,
      passed: 1,
      total: 4,
      quarantined: 7,
    })
  })

  it("puts failures first and passed checks last", () => {
    expect(sortChecks(quality.checks).map((check) => check.name)).toEqual([
      "c.err",
      "b.warn",
      "d.info",
      "a.ok",
    ])
  })

  it("groups runs per pipe with regime coverage", () => {
    const [first, second] = pipeCoverage(quality)
    expect(first).toMatchObject({ pipeId: 1, minResidual: 3.1, eligible: true, regimeDays: 31 })
    expect(first?.runs.map((item) => item.run_date)).toEqual(["2018-01-01", "2022-01-01"])
    expect(second).toMatchObject({
      pipeId: 2,
      minResidual: null,
      eligible: false,
      regimeDays: null,
    })
  })

  it("summarises storage layers", () => {
    expect(layerSummary(quality.tables)).toEqual([
      { layer: "raw", tables: 2, rows: 15 },
      { layer: "core", tables: 1, rows: 2 },
    ])
  })
})
