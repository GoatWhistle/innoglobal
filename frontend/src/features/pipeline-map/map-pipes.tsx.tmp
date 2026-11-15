import type { PipeList, PipeSummary } from "@/entities/pipe"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { Button, ButtonLink } from "@/shared/ui"
import styles from "./map-sidebar.module.css"

export interface MapPipesProps {
  readonly pipes: PipeList
  readonly selected: number | undefined
  readonly onSelect: (id: number) => void
}

function share(pipe: PipeSummary): number {
  const nominal = pipe.passport.nominal_wall_mm
  return nominal > 0 ? Math.max(0, Math.min(100, (pipe.thinnest_mm / nominal) * 100)) : 0
}

export function MapPipes({ pipes, selected, onSelect }: MapPipesProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  return (
    <section className={styles.block}>
      <p className={styles.caption}>{t("variants:workspace.mapPipes")}</p>
      <ul className={styles.options}>
        {pipes.items.map((pipe) => (
          <li key={pipe.pipe_id}>
            <Button
              variant="quiet"
              className={styles.option}
              aria-pressed={pipe.pipe_id === selected}
              onClick={() => onSelect(pipe.pipe_id)}
            >
              <span className={styles.optionBody}>
                <span className={styles.optionRow}>
                  <span className={styles.optionName}>{pipe.passport.direction}</span>
                  <span className={styles.optionValue}>
                    {format.number(pipe.thinnest_mm, 2)}
                    <small>{t("pipe:unit.mmShort")}</small>
                  </span>
                </span>
                <svg
                  className={styles.gauge}
                  viewBox="0 0 100 2"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <rect className={styles.gaugeTrack} width="100" height="2" />
                  <rect className={styles.gaugeFill} width={share(pipe)} height="2" />
                </svg>
                <span className={styles.optionMeta}>
                  {t("variants:workspace.pipeLine", {
                    id: pipe.pipe_id,
                    length: format.number(pipe.passport.length_m / 1000, 1),
                  })}
                </span>
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function MapSelection({ pipe }: { readonly pipe: PipeSummary }) {
  const { t } = useTranslation()
  const format = useFormatters()
  const mm = (value: number) => `${format.number(value, 2)} ${t("pipe:unit.mmShort")}`
  return (
    <section className={styles.block}>
      <p className={styles.caption}>{t("variants:workspace.mapSelected")}</p>
      <dl className={styles.facts}>
        <div>
          <dt>{t("variants:workspace.minimumBy", { date: format.date(pipe.target_date) })}</dt>
          <dd>{mm(pipe.thinnest_mm)}</dd>
        </div>
        <div>
          <dt>{t("variants:workspace.nominal")}</dt>
          <dd>{mm(pipe.passport.nominal_wall_mm)}</dd>
        </div>
        <div>
          <dt>{t("variants:workspace.queueCount")}</dt>
          <dd>{pipe.priority_count}</dd>
        </div>
        <div>
          <dt>{t("variants:lastVtd")}</dt>
          <dd>
            {pipe.last_observed_run ? format.date(pipe.last_observed_run) : t("variants:missing")}
          </dd>
        </div>
      </dl>
      <ButtonLink className={styles.open} icon="arrow-right" to={`/?pipe=${pipe.pipe_id}`}>
        {t("variants:workspace.openPipe")}
      </ButtonLink>
    </section>
  )
}
