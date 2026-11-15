import { type CSSProperties, useState } from "react"
import { useThickness } from "@/entities/pipe"
import type { WorkspaceProps } from "@/features/engineering-variants"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { Button, ScrollArea, Segmented } from "@/shared/ui"
import styles from "./dashboard-priority.module.css"

export function DashboardPriority({ workspace }: { readonly workspace: WorkspaceProps }) {
  const { t } = useTranslation(),
    thickness = useThickness(),
    format = useFormatters()
  const [order, setOrder] = useState<"rank" | "distance">("rank")
  const nominal = workspace.pipe.passport.nominal_wall_mm
  const rows = workspace.profile.rows
    .filter(
      (r) =>
        r.priority_rank !== null &&
        r.end_m > workspace.range.from &&
        r.start_m < workspace.range.to,
    )
    .sort((a, b) =>
      order === "rank" ? (a.priority_rank ?? 0) - (b.priority_rank ?? 0) : a.start_m - b.start_m,
    )
  return (
    <div className={styles.priority}>
      <div className={styles.bar}>
        <p className={styles.summary}>
          {t("variants:dash.queueSummary", {
            n: rows.length,
            value: thickness.withUnit(workspace.pipe.priority_cutoff_mm),
          })}
        </p>
        <Segmented
          label={t("variants:order")}
          value={order}
          onChange={setOrder}
          options={[
            { value: "rank", label: t("variants:byPriority") },
            { value: "distance", label: t("variants:byDistance") },
          ]}
        />
      </div>
      <div className={styles.body}>
        <ScrollArea className={styles.scroll}>
          {rows.length === 0 ? (
            <p className={styles.empty}>{t("variants:emptyQueue")}</p>
          ) : (
            <table className={styles.table} aria-label={t("variants:queueEntries")}>
              <thead>
                <tr>
                  <th>{t("variants:dash.queueRank")}</th>
                  <th>{t("variants:dash.queueSegment")}</th>
                  <th>{t("variants:dash.queueForecast")}</th>
                  <th>
                    {t("variants:dash.queueShare", {
                      value: format.number(nominal, 2),
                    })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.segment_id}
                    aria-selected={row.segment_id === workspace.row.segment_id}
                  >
                    <td>{row.priority_rank}</td>
                    <td>
                      <Button
                        variant="quiet"
                        aria-pressed={row.segment_id === workspace.row.segment_id}
                        onClick={() => workspace.onSelect(row.segment_id)}
                      >
                        {thickness.range(row.start_m, row.end_m)}
                      </Button>
                    </td>
                    <td>{thickness.withUnit(row.forecast_mm)}</td>
                    <td>
                      <span className={styles.gauge}>
                        <span className={styles.track}>
                          <span
                            className={styles.fill}
                            style={
                              {
                                "--share": `${Math.min(100, (row.forecast_mm / nominal) * 100)}%`,
                              } as CSSProperties
                            }
                          />
                        </span>
                        {format.percent(row.forecast_mm / nominal)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
