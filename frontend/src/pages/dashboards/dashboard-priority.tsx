import { useState } from "react"
import { useThickness } from "@/entities/pipe"
import type { WorkspaceProps } from "@/features/engineering-variants"
import { useTranslation } from "@/shared/i18n"
import { BarList, Button, ScrollArea, Select } from "@/shared/ui"
import styles from "./dashboard-widget.module.css"
export function DashboardPriority({ workspace }: { readonly workspace: WorkspaceProps }) {
  const { t } = useTranslation(),
    thickness = useThickness()
  const [order, setOrder] = useState<"rank" | "distance">("rank")
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
      <Select
        label={t("variants:order")}
        value={order}
        onChange={setOrder}
        options={[
          { value: "rank", label: t("variants:byPriority") },
          { value: "distance", label: t("variants:byDistance") },
        ]}
      />
      <ScrollArea className={styles.priorityRows}>
        <BarList
          label={t("variants:queueEntries")}
          items={rows.map((row) => ({
            id: String(row.segment_id),
            label: (
              <Button
                variant="quiet"
                aria-pressed={row.segment_id === workspace.row.segment_id}
                onClick={() => workspace.onSelect(row.segment_id)}
              >
                {thickness.range(row.start_m, row.end_m)}
              </Button>
            ),
            value: thickness.withUnit(row.forecast_mm),
            share: row.forecast_mm / workspace.pipe.passport.nominal_wall_mm,
            emphasis: row.segment_id === workspace.row.segment_id,
          }))}
        />
        {rows.length === 0 ? <p>{t("variants:emptyQueue")}</p> : null}
      </ScrollArea>
      <p className={styles.note}>
        {t("variants:dash.priorityScale", {
          value: thickness.withUnit(workspace.pipe.passport.nominal_wall_mm),
        })}
      </p>
    </div>
  )
}
