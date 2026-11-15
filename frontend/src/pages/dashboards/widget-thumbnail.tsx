import type { WidgetDefinition } from "@/entities/dashboard"
import { useThickness } from "@/entities/pipe"
import type { WorkspaceProps } from "@/features/engineering-variants"
import styles from "./dashboard-library.module.css"
export function WidgetThumbnail({
  definition,
  workspace,
}: {
  readonly definition: WidgetDefinition
  readonly workspace: WorkspaceProps
}) {
  const thickness = useThickness()
  const rows = workspace.profile.rows.filter(
    (r) => r.end_m > workspace.range.from && r.start_m < workspace.range.to,
  )
  const sample = rows
    .filter((_, index) => index % Math.max(1, Math.floor(rows.length / 32)) === 0)
    .slice(0, 32)
  const nominal = workspace.pipe.passport.nominal_wall_mm
  if (definition.kind === "metric")
    return (
      <strong className={styles.thumbnailValue} aria-hidden="true">
        {thickness.withUnit(workspace.row.forecast_mm)}
      </strong>
    )
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 32"
      preserveAspectRatio="none"
      className={styles.thumbnail}
    >
      {sample.map((row, index) => {
        const height = Math.max(1, Math.min(30, (row.forecast_mm / nominal) * 30))
        return (
          <rect
            key={row.segment_id}
            x={index * (160 / sample.length)}
            y={32 - height}
            width={Math.max(1, 160 / sample.length - 1)}
            height={height}
          />
        )
      })}
    </svg>
  )
}
