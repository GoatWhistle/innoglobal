import { clsx } from "clsx"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { ButtonLink, Card } from "@/shared/ui"
import type { PipeSummary } from "./pipe.types"
import styles from "./pipe-card.module.css"

export interface PipeCardProps {
  readonly pipe: PipeSummary
  readonly appearance?: "plain" | "panel"
  readonly heading?: string | undefined
  readonly className?: string | undefined
}

export function PipeCard({ pipe, appearance = "plain", heading, className }: PipeCardProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  return (
    <Card
      as="aside"
      appearance={appearance}
      className={clsx(styles.card, className)}
      title={heading ?? pipe.passport.direction}
      description={
        heading === undefined
          ? t("variants:workspace.pipeLine", {
              id: pipe.pipe_id,
              length: format.number(pipe.passport.length_m / 1000, 1),
            })
          : undefined
      }
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
            {pipe.last_observed_run ? format.date(pipe.last_observed_run) : t("variants:missing")}
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
  )
}
