import { useState } from "react"
import { priorityGroups, type SegmentRow, useThickness } from "@/entities/pipe"
import { useTranslation } from "@/shared/i18n"
import { Button, ButtonAnchor, Card, Disclosure, ScrollArea, Segmented } from "@/shared/ui"
import type { WorkspaceProps } from "../variant-types"
import styles from "./priority-queue.module.css"

export interface PriorityQueueProps extends Pick<WorkspaceProps, "pipe" | "row" | "onSelect"> {
  readonly rows: readonly SegmentRow[]
  readonly order: "rank" | "distance"
  readonly onOrder: (order: "rank" | "distance") => void
}

export function PriorityQueue({ rows, pipe, row, order, onOrder, onSelect }: PriorityQueueProps) {
  const { t } = useTranslation()
  const thickness = useThickness()
  const [view, setView] = useState<"segments" | "groups">("segments")
  const groups = priorityGroups(rows).sort((a, b) =>
    order === "rank"
      ? (a.lead.priority_rank ?? 0) - (b.lead.priority_rank ?? 0)
      : a.start - b.start,
  )
  const item = (segment: SegmentRow) => (
    <Button
      key={segment.segment_id}
      className={styles.item}
      variant="quiet"
      onClick={() => onSelect(segment.segment_id)}
      aria-pressed={segment.segment_id === row.segment_id}
    >
      <span className={styles.itemContent}>
        <span className={styles.rank}>{segment.priority_rank}</span>
        <span className={styles.coordinate}>
          <strong>{thickness.range(segment.start_m, segment.end_m)}</strong>
          <span>
            {t(segment.observations.length ? "variants:hasMeasurement" : "variants:nominalOnly")}
          </span>
        </span>
        <strong>{thickness.value(segment.forecast_mm)}</strong>
      </span>
    </Button>
  )
  return (
    <section className={styles.queue} aria-label={t("variants:queue")}>
      <Card
        appearance="plain"
        className={styles.heading}
        title={t("variants:queueTitle", { count: pipe.priority_count })}
      >
        {null}
      </Card>
      <Disclosure title={t("assistant:rankingTitle")}>
        <p className={styles.note}>{t("assistant:ranking")}</p>
      </Disclosure>
      <Segmented
        label={t("variants:queueView")}
        value={view}
        onChange={setView}
        options={[
          { value: "segments", label: t("variants:segments") },
          { value: "groups", label: t("variants:groups") },
        ]}
      />
      <Segmented
        label={t("variants:order")}
        value={order}
        onChange={onOrder}
        options={[
          { value: "rank", label: t("variants:byPriority") },
          { value: "distance", label: t("variants:byDistance") },
        ]}
      />
      <div className={styles.columnLabels} aria-hidden="true">
        <span>{t("variants:location")}</span>
        <span>{t("pipe:unit.mmShort")}</span>
      </div>
      <ScrollArea className={styles.list} role="region" aria-label={t("variants:queueEntries")}>
        {rows.length ? null : <p>{t("variants:emptyQueue")}</p>}
        {view === "segments"
          ? rows.map(item)
          : groups.map((group) => (
              <div key={group.start} className={styles.group}>
                <Button
                  variant="quiet"
                  icon="search"
                  onClick={() => onSelect(group.lead.segment_id)}
                >
                  <span className={styles.groupTitle}>
                    <strong>{thickness.range(group.start, group.end)}</strong>
                    <span>
                      {t("variants:groupMinimum", {
                        value: thickness.withUnit(group.lead.forecast_mm),
                      })}
                    </span>
                  </span>
                </Button>
                <Disclosure title={t("variants:groupCount", { count: group.rows.length })}>
                  {group.rows.map(item)}
                </Disclosure>
              </div>
            ))}
      </ScrollArea>
      <ButtonAnchor
        href={`/api/v1/pipes/${pipe.pipe_id}/priorities.csv`}
        variant="secondary"
        icon="download"
      >
        {t("variants:exportPriorities")}
      </ButtonAnchor>
      <p className={styles.note}>{t("variants:priorityExportHint")}</p>
    </section>
  )
}
