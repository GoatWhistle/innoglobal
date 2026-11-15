import { useState } from "react"
import { useMediaQuery } from "@/shared/hooks"
import { useTranslation } from "@/shared/i18n"
import { Button, Disclosure, Drawer, IconButton, Segmented } from "@/shared/ui"
import { ComparisonPanel } from "../comparison/comparison-panel"
import { SegmentFacts } from "../segment-facts"
import { localRange } from "../track-model"
import type { WorkspaceProps } from "../variant-types"
import { WorkspaceFrame } from "../workspace-frame"
import styles from "./inspection.module.css"
import { PriorityQueue } from "./priority-queue"

export function Inspection(props: WorkspaceProps) {
  const { t } = useTranslation()
  const compact = useMediaQuery("(width < 75rem)")
  const [queueOpen, setQueueOpen] = useState(false)
  const [queueCollapsed, setQueueCollapsed] = useState(false)
  const queueHidden = compact || queueCollapsed
  const [sceneCollapsed, setSceneCollapsed] = useState(false)
  const [order, setOrder] = useState<"rank" | "distance">("rank")
  const queue = props.profile.rows
    .filter((row) => row.priority_rank !== null)
    .sort((a, b) =>
      order === "rank" ? (a.priority_rank ?? 0) - (b.priority_rank ?? 0) : a.start_m - b.start_m,
    )
  const index = queue.findIndex((row) => row.segment_id === props.row.segment_id)
  const date = props.baselineDate
  const [scope, setScope] = useState<"local" | "pipe">(
    props.range.from > 0 || props.range.to < props.pipe.passport.length_m ? "pipe" : "local",
  )
  const range = inspectionRange(props, scope)
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
  const list = (
    <PriorityQueue
      pipe={props.pipe}
      row={props.row}
      rows={queue}
      order={order}
      onOrder={setOrder}
      onSelect={(id) => {
        props.onSelect(id)
        setQueueOpen(false)
      }}
    />
  )
  return (
    <>
      <WorkspaceFrame
        context={props}
        kind="inspection"
        comparisonDate={date ?? null}
        aside={props.aside?.(range) ?? <SegmentFacts {...props} comparisonDate={date ?? null} />}
        queue={
          queueHidden ? undefined : (
            <>
              <Button variant="quiet" onClick={() => setQueueCollapsed(true)}>
                {t("assistant:hideQueue")}
              </Button>
              {list}
            </>
          )
        }
      >
        {queueHidden ? (
          <Button
            variant="secondary"
            icon="journal"
            onClick={() => (compact ? setQueueOpen(true) : setQueueCollapsed(false))}
          >
            {t("assistant:showQueue", { count: queue.length })}
          </Button>
        ) : null}
        <div className={styles.navigation}>
          {props.sceneControls}
          <Button variant="quiet" onClick={() => setSceneCollapsed(!sceneCollapsed)}>
            {t(sceneCollapsed ? "assistant:showScene" : "assistant:hideScene")}
          </Button>

          <div className={styles.steps}>
            <IconButton
              icon="chevron-left"
              label={t("variants:previousArea")}
              onClick={() => move(-1)}
              disabled={index <= 0 || !queue.length}
            />
            <span>
              {index < 0
                ? t("variants:outsideQueue")
                : t("variants:queuePosition", { current: index + 1, count: queue.length })}
            </span>
            <IconButton
              icon="chevron-right"
              label={t(index < 0 ? "variants:startQueue" : "variants:nextArea")}
              onClick={() => move(1)}
              disabled={index === queue.length - 1 || !queue.length}
            />
          </div>
        </div>
        <div hidden={sceneCollapsed}>{props.scene}</div>
        <ComparisonPanel
          {...instrument}
          date={date}
          onDate={props.onComparisonDate ?? (() => undefined)}
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
        <Disclosure title={t("variants:overviewDetails")}>
          <p className={styles.hint}>{t("pipe:restoration.keyboard")}</p>
          {props.overview}
        </Disclosure>
      </WorkspaceFrame>
      {compact ? (
        <Drawer open={queueOpen} onClose={() => setQueueOpen(false)} title={t("variants:queue")}>
          {list}
        </Drawer>
      ) : null}
    </>
  )
}

function inspectionRange(props: WorkspaceProps, scope: "local" | "pipe") {
  return scope === "local" &&
    props.range.from === 0 &&
    props.range.to >= props.pipe.passport.length_m
    ? localRange(props.profile.rows, props.row.segment_id, 3)
    : props.range
}
