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
  const [stirred, setStirred] = useState<number | null>(null)
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
      {pipes.items.map((pipe, index) => (
        <article
          className={styles.row}
          key={pipe.pipe_id}
          onPointerEnter={() => setStirred(pipe.pipe_id)}
          onPointerLeave={() => setStirred(null)}
        >
          <ButtonLink className={styles.pipe} variant="quiet" to={`/?pipe=${pipe.pipe_id}`}>
            <PipePreview
              name={pipe.passport.direction}
              order={index}
              stirred={stirred === pipe.pipe_id}
            />
            <span className="visually-hidden">{pipe.passport.direction}</span>
          </ButtonLink>
          <Card
            as="aside"
            appearance="plain"
            className={styles.details}
            title={pipe.passport.direction}
            description={t("variants:workspace.pipeLine", {
              id: pipe.pipe_id,
              length: format.number(pipe.passport.length_m / 1000, 1),
            })}
          >
            <div className={styles.lead}>
              <p>{t("variants:workspace.minimumBy", { date: format.date(pipe.target_date) })}</p>
              <p className={styles.minimum}>
                {format.number(pipe.thinnest_mm, 2)}
                <small>{t("pipe:unit.mmShort")}</small>
              </p>
              <p>
                {t("variants:workspace.ofNominal", {
                  value: format.number(pipe.passport.nominal_wall_mm, 2),
                })}
              </p>
            </div>
            <dl>
              <div>
                <dt>{t("variants:workspace.queueCount")}</dt>
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
            <ButtonLink
              className={styles.open}
              variant="secondary"
              icon="arrow-right"
              to={`/?pipe=${pipe.pipe_id}`}
            >
              {t("variants:workspace.openPipe")}
            </ButtonLink>
          </Card>
        </article>
      ))}
    </section>
  )
}
