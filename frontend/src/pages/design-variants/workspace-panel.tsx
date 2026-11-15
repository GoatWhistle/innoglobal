import { useState } from "react"
import type { PipeSummary, Profile, SegmentRow } from "@/entities/pipe"
import { useThickness } from "@/entities/pipe"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { Button, Card, ScrollArea, Segmented } from "@/shared/ui"
import { SegmentPicker } from "./segment-picker"
import styles from "./workspace-panel.module.css"

export interface WorkspacePanelProps {
  readonly pipe: PipeSummary
  readonly profile: Profile
  readonly row: SegmentRow
  readonly selected: number | null
  readonly inspecting: boolean
  readonly onSelect: (id: number) => void
  readonly onInspect: () => void
}

function SegmentFactsList({ pipe, row }: { readonly pipe: PipeSummary; readonly row: SegmentRow }) {
  const { t } = useTranslation()
  const thickness = useThickness()
  const format = useFormatters()
  const last = row.observations.at(-1)
  return (
    <dl className={styles.facts}>
      <div className={styles.lead}>
        <dt>{t("variants:workspace.minimum")}</dt>
        <dd>{thickness.withUnit(row.forecast_mm)}</dd>
      </div>
      <div>
        <dt>{t("inspector:nominal")}</dt>
        <dd>{thickness.withUnit(pipe.passport.nominal_wall_mm)}</dd>
      </div>
      <div>
        <dt>{t("inspector:interval")}</dt>
        <dd>
          {t("pipe:unit.span", {
            from: thickness.value(row.p10_mm),
            to: thickness.withUnit(row.p90_mm),
          })}
        </dd>
      </div>
      <div>
        <dt>{t(last ? "variants:lastVtd" : "variants:commissioned")}</dt>
        <dd>
          {last
            ? thickness.withUnit(last.residual_mm)
            : pipe.passport.commissioned_at
              ? format.date(pipe.passport.commissioned_at)
              : t("variants:missing")}
        </dd>
      </div>
      <div>
        <dt>{t("variants:queue")}</dt>
        <dd>{row.priority_rank ?? t("variants:outsideQueue")}</dd>
      </div>
    </dl>
  )
}

export function WorkspacePanel(props: WorkspacePanelProps) {
  const { pipe, profile, row, selected, inspecting, onSelect } = props
  const { t } = useTranslation()
  const thickness = useThickness()
  const [order, setOrder] = useState<"rank" | "distance">("rank")
  const queue = profile.rows
    .filter((item) => item.priority_rank !== null)
    .sort((a, b) =>
      order === "rank" ? (a.priority_rank ?? 0) - (b.priority_rank ?? 0) : a.start_m - b.start_m,
    )
  return (
    <div className={styles.panel}>
      <section className={styles.block}>
        <SegmentPicker
          key={selected ?? "none"}
          selected={selected}
          max={pipe.segments - 1}
          onSelect={onSelect}
        />
      </section>
      {selected === null ? (
        <p className={styles.prompt}>{t("variants:workspace.pickPrompt")}</p>
      ) : (
        <Card
          appearance="plain"
          className={styles.block}
          title={t("inspector:title", { segment: row.segment_id })}
          actions={<span className={styles.count}>{thickness.range(row.start_m, row.end_m)}</span>}
        >
          <SegmentFactsList pipe={pipe} row={row} />
          {inspecting ? (
            <p className={styles.note}>{t("variants:workspace.illustration")}</p>
          ) : null}
          <Button variant="secondary" icon="search" onClick={props.onInspect}>
            {t(inspecting ? "variants:workspace.return" : "variants:workspace.inspect")}
          </Button>
        </Card>
      )}
      <Card
        appearance="plain"
        className={styles.queueBlock}
        title={t("variants:queue")}
        actions={<span className={styles.count}>{queue.length}</span>}
      >
        <Segmented
          label={t("variants:order")}
          value={order}
          onChange={setOrder}
          options={[
            { value: "rank", label: t("variants:byPriority") },
            { value: "distance", label: t("variants:byDistance") },
          ]}
        />
        <ScrollArea className={styles.queueScroll}>
          <ul className={styles.queue}>
            {queue.map((item) => (
              <li key={item.segment_id}>
                <Button
                  variant="quiet"
                  className={styles.queueItem}
                  aria-pressed={item.segment_id === selected}
                  onClick={() => onSelect(item.segment_id)}
                >
                  <span className={styles.queueRow}>
                    <span className={styles.rank}>{item.priority_rank}</span>
                    <span className={styles.where}>
                      {thickness.range(item.start_m, item.end_m)}
                    </span>
                    <strong>{thickness.withUnit(item.forecast_mm)}</strong>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </Card>
    </div>
  )
}
