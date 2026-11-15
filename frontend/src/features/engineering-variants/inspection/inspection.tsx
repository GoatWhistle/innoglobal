import { useState } from "react"
import { useThickness } from "@/entities/pipe"
import { useTranslation } from "@/shared/i18n"
import { Button, Card, ScrollArea, Segmented } from "@/shared/ui"
import { ComparisonPanel } from "../comparison/comparison-panel"
import { OverviewRuler } from "../controls/overview-ruler"
import { ScaleLegend } from "../controls/scale-legend"
import { SegmentFacts } from "../segment-facts"
import { localRange } from "../track-model"
import type { WorkspaceProps } from "../variant-types"
import { WorkspaceFrame } from "../workspace-frame"
import styles from "./inspection.module.css"

export function Inspection(props: WorkspaceProps) {
  const { t } = useTranslation()
  const thickness = useThickness()
  const [order, setOrder] = useState<"rank" | "distance">("rank")
  const queue = props.profile.rows
    .filter((row) => row.priority_rank !== null)
    .sort((a, b) =>
      order === "rank" ? (a.priority_rank ?? 0) - (b.priority_rank ?? 0) : a.start_m - b.start_m,
    )
  const index = queue.findIndex((row) => row.segment_id === props.row.segment_id)
  const [selectedDate, setSelectedDate] = useState(props.pipe.last_observed_run ?? "nominal")
  const date = props.profile.run_dates.includes(selectedDate) ? selectedDate : undefined
  const [scope, setScope] = useState<"local" | "pipe">(
    props.range.from > 0 || props.range.to < props.pipe.passport.length_m ? "pipe" : "local",
  )
  const range =
    scope === "local" ? localRange(props.profile.rows, props.row.segment_id, 3) : props.range
  const instrument = {
    ...props,
    range,
    onRange: (next: WorkspaceProps["range"]) => {
      setScope("pipe")
      props.onRange(next)
    },
  }
  const move = (offset: number) => {
    const row = queue[index < 0 ? 0 : Math.max(0, Math.min(queue.length - 1, index + offset))]
    if (row) props.onSelect(row.segment_id)
  }
  return (
    <WorkspaceFrame
      context={props}
      kind="inspection"
      comparisonDate={date ?? null}
      aside={<SegmentFacts {...props} comparisonDate={date ?? null} />}
      queue={
        <div className={styles.queue} id="inspection-queue">
          <Card appearance="plain" title={t("variants:queue")}>
            {null}
          </Card>
          <p>{t("variants:priorityRule")}</p>
          <Segmented
            label={t("variants:order")}
            value={order}
            onChange={setOrder}
            options={[
              { value: "rank", label: t("variants:byPriority") },
              { value: "distance", label: t("variants:byDistance") },
            ]}
          />
          <ScrollArea className={styles.list} role="region" aria-label={t("variants:queue")}>
            {queue.length ? null : <p>{t("variants:emptyQueue")}</p>}
            {queue.map((row) => (
              <Button
                key={row.segment_id}
                variant={row.segment_id === props.row.segment_id ? "primary" : "quiet"}
                icon="pipe"
                onClick={() => props.onSelect(row.segment_id)}
                aria-pressed={row.segment_id === props.row.segment_id}
              >
                <span className={styles.queueRow}>
                  <span>
                    {t("variants:queueRow", { rank: row.priority_rank, distance: row.start_m })}
                  </span>
                  <strong>{thickness.withUnit(row.forecast_mm)}</strong>
                </span>
              </Button>
            ))}
          </ScrollArea>
        </div>
      }
    >
      <div className={styles.navigation}>
        <Button
          variant="secondary"
          icon="chevron-left"
          onClick={() => move(-1)}
          disabled={index === 0 || !queue.length}
        >
          {t("variants:previousArea")}
        </Button>
        <span>
          {index < 0
            ? t("variants:outsideQueue")
            : t("variants:queuePosition", { current: index + 1, count: queue.length })}
        </span>
        <Button
          icon="chevron-right"
          onClick={() => move(1)}
          disabled={index === queue.length - 1 || !queue.length}
        >
          {t(index < 0 ? "variants:startQueue" : "variants:nextArea")}
        </Button>
      </div>
      {props.scene}
      <ScaleLegend low={props.pipe.thinnest_mm} high={props.pipe.passport.nominal_wall_mm} />
      <ComparisonPanel
        {...instrument}
        date={date}
        onDate={setSelectedDate}
        compact
        controls={
          <Segmented
            label={t("variants:viewRange")}
            value={scope}
            onChange={(value) => {
              setScope(value)
              props.onReset()
            }}
            options={[
              { value: "local", label: t("variants:localScope"), icon: "search" },
              { value: "pipe", label: t("variants:whole"), icon: "expand" },
            ]}
          />
        }
      />
      <OverviewRuler {...instrument} />
    </WorkspaceFrame>
  )
}
