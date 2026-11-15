import { useState } from "react"
import type { PipeList } from "@/entities/pipe"
import { PipePreview } from "@/features/material-pipe"
import { PipelineMap } from "@/features/pipeline-map"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { Button, ButtonLink, Card } from "@/shared/ui"
import styles from "./pipeline-fleet.module.css"

export function PipelineFleet({ pipes }: { readonly pipes: PipeList }) {
  const { t } = useTranslation(),
    format = useFormatters()
  const [map, setMap] = useState(false)
  if (map)
    return (
      <>
        <Button variant="quiet" icon="arrow-left" onClick={() => setMap(false)}>
          {t("variants:workspace.fleet")}
        </Button>
        <PipelineMap pipes={pipes} />
      </>
    )
  return (
    <section className={styles.fleet}>
      <header className={styles.heading}>
        <h1>{t("variants:workspace.fleet")}</h1>
        <Button variant="secondary" onClick={() => setMap(true)}>
          {t("variants:workspace.mapView")}
        </Button>
      </header>
      {pipes.items.map((pipe) => (
        <article className={styles.row} key={pipe.pipe_id}>
          <ButtonLink className={styles.pipe} variant="quiet" to={`/?pipe=${pipe.pipe_id}`}>
            <PipePreview name={pipe.passport.direction} />
            <span className="visually-hidden">{pipe.passport.direction}</span>
          </ButtonLink>
          <aside className={styles.details}>
            <Card appearance="plain" title={pipe.passport.direction}>
              {null}
            </Card>
            <p>{pipe.pipe_id}</p>
            <dl>
              <div>
                <dt>{t("variants:workspace.minimum")}</dt>
                <dd className={styles.minimum}>
                  {format.number(pipe.thinnest_mm, 2)} <small>{t("pipe:unit.mmShort")}</small>
                </dd>
              </div>
              <div>
                <dt>{t("variants:target")}</dt>
                <dd>{format.date(pipe.target_date)}</dd>
              </div>
              <div>
                <dt>{t("variants:queue")}</dt>
                <dd>{pipe.priority_count}</dd>
              </div>
              <div>
                <dt>{t("variants:lastVtd")}</dt>
                <dd>
                  {pipe.last_observed_run
                    ? format.date(pipe.last_observed_run)
                    : t("variants:missing")}
                </dd>
              </div>
            </dl>
            <ButtonLink variant="quiet" icon="arrow-right" to={`/?pipe=${pipe.pipe_id}`}>
              {t("variants:workspace.open")}
            </ButtonLink>
          </aside>
        </article>
      ))}
    </section>
  )
}
