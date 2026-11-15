import type { PipeList } from "@/entities/pipe"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { Button } from "@/shared/ui"
import styles from "./pipeline-map.module.css"

export interface MapPipesProps {
  readonly pipes: PipeList
  readonly selected: number | undefined
  readonly onSelect: (id: number) => void
}

export function MapPipes({ pipes, selected, onSelect }: MapPipesProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  return (
    <section className={styles.pipes}>
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
              <span className={styles.optionText}>
                <span className={styles.optionName}>{pipe.passport.direction}</span>
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

export function MapLegend() {
  const { t } = useTranslation()
  return (
    <ul className={styles.legend}>
      <li>
        <span className={styles.swatch} data-kind="product" aria-hidden="true" />
        {t("variants:workspace.mapLegendProduct")}
      </li>
      <li>
        <span className={styles.swatch} data-kind="network" aria-hidden="true" />
        {t("variants:workspace.mapLegendNetwork")}
      </li>
    </ul>
  )
}
