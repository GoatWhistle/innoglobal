import type { WidgetDefinition } from "@/entities/dashboard"
import { useThickness } from "@/entities/pipe"
import { AlignedTrack, UnrollGrid, type WorkspaceProps } from "@/features/engineering-variants"
import { useTranslation } from "@/shared/i18n"
import { Button, ScrollArea } from "@/shared/ui"
import { DeltaChart } from "./charts/delta-chart"
import { ProfileChart } from "./charts/profile-chart"
import { DashboardPriority } from "./dashboard-priority"
import styles from "./dashboard-widget.module.css"
export function DashboardWidget({
  item,
  workspace,
}: {
  readonly item: WidgetDefinition
  readonly workspace: WorkspaceProps
}) {
  const thickness = useThickness(),
    { t } = useTranslation()
  if (item.kind === "metric")
    return (
      <div className={styles.metric}>
        <strong>{thickness.withUnit(workspace.row.forecast_mm)}</strong>
        <span>{thickness.range(workspace.row.start_m, workspace.row.end_m)}</span>
      </div>
    )
  if (item.kind === "priority") return <DashboardPriority workspace={workspace} />
  if (item.kind === "grid")
    return (
      <ScrollArea className={styles.scroll}>
        <UnrollGrid
          profile={workspace.profile}
          selected={workspace.row.segment_id}
          onSelect={workspace.onSelect}
        />
      </ScrollArea>
    )
  if (item.kind === "table")
    return (
      <ScrollArea className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("variants:workspace.edit")}</th>
              <th>{t("variants:workspace.minimum")}</th>
              <th>{t("inspector:interval")}</th>
            </tr>
          </thead>
          <tbody>
            {workspace.profile.rows
              .filter((r) => r.end_m > workspace.range.from && r.start_m < workspace.range.to)
              .map((row) => (
                <tr
                  key={row.segment_id}
                  aria-selected={row.segment_id === workspace.row.segment_id}
                >
                  <td>
                    <Button variant="quiet" onClick={() => workspace.onSelect(row.segment_id)}>
                      {thickness.range(row.start_m, row.end_m)}
                    </Button>
                  </td>
                  <td>{thickness.withUnit(row.forecast_mm)}</td>
                  <td>
                    {t("pipe:unit.span", {
                      from: thickness.withUnit(row.p10_mm),
                      to: thickness.withUnit(row.p90_mm),
                    })}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </ScrollArea>
    )
  if (item.kind === "forecast") return <ProfileChart workspace={workspace} />
  if (item.kind === "delta") return <DeltaChart workspace={workspace} />
  return (
    <div className={styles.chart}>
      <AlignedTrack {...workspace} kind={item.kind} date={workspace.baselineDate} />
    </div>
  )
}
