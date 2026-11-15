import type { PipeSummary, SegmentRow } from "@/entities/pipe"
import { useThickness } from "@/entities/pipe"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { Button, Card, IconButton } from "@/shared/ui"
import styles from "./workspace-shell.module.css"
export function WorkspaceMetrics({
  pipe,
  row,
  inspecting,
  onInspect,
  onSelect,
  onCharts,
  onHide,
}: {
  readonly pipe: PipeSummary
  readonly row: SegmentRow
  readonly inspecting: boolean
  readonly onInspect: () => void
  readonly onSelect: (id: number) => void
  readonly onCharts: () => void
  readonly onHide: () => void
}) {
  const { t } = useTranslation(),
    thickness = useThickness(),
    format = useFormatters()
  const last = row.observations.at(-1)
  return (
    <aside className={styles.metrics}>
      <header>
        <Card appearance="plain" title={t("inspector:title", { segment: row.segment_id })}>
          {null}
        </Card>
        <IconButton
          icon="chevron-left"
          label={t("variants:previousArea")}
          disabled={row.segment_id === 0}
          onClick={() => onSelect(row.segment_id - 1)}
        />
        <IconButton
          icon="chevron-right"
          label={t("variants:nextArea")}
          disabled={row.segment_id === pipe.segments - 1}
          onClick={() => onSelect(row.segment_id + 1)}
        />
      </header>
      <p>{thickness.range(row.start_m, row.end_m)}</p>
      <dl>
        <div>
          <dt>{t("variants:workspace.minimum")}</dt>
          <dd className={styles.minimum}>{thickness.withUnit(row.forecast_mm)}</dd>
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
      {inspecting ? (
        <section>
          <Card appearance="plain" title={t("variants:workspace.flow")}>
            {null}
          </Card>
          <p>{t("variants:workspace.illustration")}</p>
        </section>
      ) : null}
      <Button className={styles.full} variant="secondary" onClick={onInspect}>
        {t(inspecting ? "variants:workspace.return" : "variants:workspace.inspect")}
      </Button>
      <div className={styles.bottom}>
        <Button className={styles.full} variant="secondary" onClick={onCharts}>
          {t("variants:workspace.charts")}
        </Button>
        <Button variant="quiet" onClick={onHide}>
          {t("variants:workspace.hideMetrics")}
        </Button>
      </div>
    </aside>
  )
}
