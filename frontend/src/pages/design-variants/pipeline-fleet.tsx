import { useState } from "react"
import { useSearchParams } from "react-router"
import { PipeCard, type PipeList } from "@/entities/pipe"
import { PipePreview } from "@/features/material-pipe"
import { PipelineMap } from "@/features/pipeline-map"
import { useTranslation } from "@/shared/i18n"
import { ButtonLink, Segmented } from "@/shared/ui"
import styles from "./pipeline-fleet.module.css"

type FleetView = "list" | "map"

export function PipelineFleet({ pipes }: { readonly pipes: PipeList }) {
  const { t } = useTranslation()
  const [search, setSearch] = useSearchParams()
  const view: FleetView = search.get("view") === "map" ? "map" : "list"
  const [stirred, setStirred] = useState<number | null>(null)
  const changeView = (next: FleetView) => {
    const params = new URLSearchParams(search)
    if (next === "map") params.set("view", "map")
    else params.delete("view")
    setSearch(params, { replace: true })
  }
  return (
    <section className={styles.fleet}>
      <header className={styles.heading}>
        <h1>{t("variants:workspace.fleet")}</h1>
        <Segmented
          label={t("variants:workspace.fleetView")}
          value={view}
          onChange={changeView}
          options={[
            { value: "list", label: t("variants:workspace.listView") },
            { value: "map", label: t("variants:workspace.mapView") },
          ]}
        />
      </header>
      {view === "map" ? (
        <PipelineMap pipes={pipes} />
      ) : (
        pipes.items.map((pipe, index) => (
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
            <PipeCard pipe={pipe} />
          </article>
        ))
      )}
    </section>
  )
}
