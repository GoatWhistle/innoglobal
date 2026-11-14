import { useState } from "react"
import { type SegmentRow, useThickness } from "@/entities/pipe"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { ButtonLink, DataTable, EmptyState, NoValue, Select, type SelectOption } from "@/shared/ui"
import { inBucket, kilometerBuckets, type SortKey, type SortOrder, sortRows } from "./priority-sort"
import styles from "./priority-table.module.css"
import { SortHeader } from "./sort-header"

export interface PriorityTableProps {
  readonly pipeId: number
  readonly rows: readonly SegmentRow[]
  readonly lengthM: number
  readonly latestRun: string | null
}

const ALL = "all"

export function PriorityTable({ pipeId, rows, lengthM, latestRun }: PriorityTableProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const thickness = useThickness()
  const [key, setKey] = useState<SortKey>("rank")
  const [order, setOrder] = useState<SortOrder>("asc")
  const [bucket, setBucket] = useState<string>(ALL)
  const options: SelectOption<string>[] = [
    { value: ALL, label: t("priorities:filter.all") },
    ...kilometerBuckets(lengthM).map((km) => ({
      value: String(km),
      label: t("priorities:filter.km", { from: km, to: km + 1 }),
    })),
  ]
  const active = bucket === ALL ? null : Number(bucket)
  const shown = sortRows(
    rows.filter((row) => inBucket(row, active)),
    key,
    order,
  )
  const sortBy = (next: SortKey) => {
    if (next === key) setOrder(order === "asc" ? "desc" : "asc")
    else {
      setKey(next)
      setOrder("asc")
    }
  }
  const latestValue = (row: SegmentRow) => {
    const item = row.observations.find((entry) => entry.run_date === latestRun)
    return item === undefined ? <NoValue /> : thickness.value(item.residual_mm)
  }
  return (
    <div className={styles.table}>
      <div className={styles.toolbar}>
        <Select
          label={t("priorities:filter.label")}
          options={options}
          value={bucket}
          onChange={setBucket}
          className={styles.filter}
        />
        <p className={styles.count} aria-live="polite">
          {t("priorities:shown", {
            shown: format.integer(shown.length),
            total: format.integer(rows.length),
          })}
        </p>
      </div>
      {shown.length === 0 ? (
        <EmptyState
          icon="filter"
          title={t("priorities:empty.title")}
          description={t("priorities:empty.description")}
        />
      ) : (
        <DataTable
          label={t("priorities:tableLabel")}
          head={
            <tr>
              <SortHeader
                label={t("priorities:col.rank")}
                sortKey="rank"
                active={key}
                order={order}
                onSort={sortBy}
              />
              <th scope="col">{t("priorities:col.segment")}</th>
              <SortHeader
                label={t("priorities:col.distance")}
                sortKey="distance"
                active={key}
                order={order}
                onSort={sortBy}
              />
              <SortHeader
                label={t("priorities:col.forecast")}
                sortKey="thickness"
                active={key}
                order={order}
                onSort={sortBy}
                numeric
              />
              <th scope="col" data-numeric="">
                {t("priorities:col.interval")}
              </th>
              {latestRun === null ? null : (
                <th scope="col" data-numeric="">
                  {t("priorities:col.latest", { date: format.date(latestRun) })}
                </th>
              )}
              <th scope="col">
                <span className="visually-hidden">{t("priorities:col.open")}</span>
              </th>
            </tr>
          }
        >
          {shown.map((row) => (
            <tr key={row.segment_id}>
              <td>{row.priority_rank}</td>
              <th scope="row">{row.segment_id}</th>
              <td>{thickness.range(row.start_m, row.end_m)}</td>
              <td data-numeric="">{thickness.value(row.forecast_mm)}</td>
              <td data-numeric="">
                {t("pipe:unit.span", {
                  from: thickness.value(row.p10_mm),
                  to: thickness.value(row.p90_mm),
                })}
              </td>
              {latestRun === null ? null : <td data-numeric="">{latestValue(row)}</td>}
              <td>
                <ButtonLink
                  to={`/pipes/${pipeId}?segment=${row.segment_id}`}
                  variant="quiet"
                  size="compact"
                  icon="arrow-right"
                >
                  {t("priorities:open", { segment: row.segment_id })}
                </ButtonLink>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  )
}
