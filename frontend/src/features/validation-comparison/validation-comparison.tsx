import { useState } from "react"
import type { ValidationComparison as Comparison } from "@/entities/reference"
import { useFormatters, useTranslation } from "@/shared/i18n"
import {
  Card,
  DataTable,
  EmptyState,
  NoValue,
  ScatterPlot,
  Segmented,
  Stat,
  StatGrid,
} from "@/shared/ui"

export interface ValidationComparisonProps {
  readonly comparison: Comparison
}

export function ValidationComparison({ comparison }: ValidationComparisonProps) {
  const { t } = useTranslation()
  const [view, setView] = useState<"chart" | "table">("chart")
  const format = useFormatters()
  return (
    <Card title={t("model:comparison.title")} description={t("model:comparison.separate")}>
      {comparison.status !== "available" ? (
        <EmptyState
          icon="info"
          title={t("model:comparison.unavailable")}
          description={t("model:comparison.mismatch", { count: comparison.source_samples })}
        />
      ) : (
        <>
          <StatGrid>
            <Stat
              label={t("model:comparison.samples")}
              value={format.integer(comparison.points.length)}
            />
            <Stat
              label={t("model:r2")}
              value={
                comparison.pearson_r2 === null ? (
                  <NoValue />
                ) : (
                  format.number(comparison.pearson_r2, 3)
                )
              }
            />
            <Stat
              label={t("model:mae")}
              value={comparison.mae_mm === null ? <NoValue /> : format.number(comparison.mae_mm, 3)}
              unit={t("pipe:unit.mmShort")}
            />
          </StatGrid>
          <Segmented
            label={t("model:comparison.view")}
            value={view}
            onChange={setView}
            options={[
              { value: "chart", label: t("model:comparison.chart"), icon: "chart" },
              { value: "table", label: t("model:comparison.tableTab"), icon: "journal" },
            ]}
          />
          {view === "chart" ? (
            <>
              <ScatterPlot
                label={t("model:comparison.label")}
                xLabel={t("model:comparison.observed")}
                yLabel={t("model:comparison.forecast")}
                points={comparison.points.map((point) => ({
                  id: `${point.pipe_id}-${point.segment_id}`,
                  x: point.observed_mm,
                  y: point.forecast_mm,
                }))}
              />
              <p>{t("model:comparison.reading")}</p>
            </>
          ) : (
            <DataTable
              label={t("model:comparison.table")}
              head={
                <tr>
                  <th scope="col">{t("model:comparison.pipe")}</th>
                  <th scope="col">{t("model:comparison.segment")}</th>
                  <th scope="col">{t("model:comparison.observed")}</th>
                  <th scope="col">{t("model:comparison.forecast")}</th>
                </tr>
              }
            >
              {comparison.points.map((point) => (
                <tr key={`${point.pipe_id}-${point.segment_id}`}>
                  <th scope="row">{point.pipe_id}</th>
                  <td>{point.segment_id}</td>
                  <td>{format.number(point.observed_mm, 3)}</td>
                  <td>{format.number(point.forecast_mm, 3)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </>
      )}
    </Card>
  )
}
