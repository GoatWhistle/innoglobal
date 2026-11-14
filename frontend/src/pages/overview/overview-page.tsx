import { useState } from "react"
import { usePipes, useProfile } from "@/entities/pipe"
import { useNetwork } from "@/entities/reference"
import { PipeSwitch } from "@/features/pipe-switch"
import { RouteMap } from "@/features/route-map"
import { useDocumentTitle, useTranslation } from "@/shared/i18n"
import { Card, PageHeader, QueryView, Skeleton } from "@/shared/ui"
import styles from "./overview-page.module.css"
import { PipeOverviewCard } from "./pipe-overview-card"

export function OverviewPage() {
  const { t } = useTranslation()
  useDocumentTitle(null)
  const pipes = usePipes()
  const network = useNetwork()
  const [mapPipe, setMapPipe] = useState<number | null>(null)
  const items = pipes.data?.items ?? []
  const shown = items.find((item) => item.pipe_id === mapPipe) ?? items[0]
  const profile = useProfile(shown?.pipe_id ?? null)
  return (
    <div className={styles.page}>
      <PageHeader title={t("overview:title")} description={t("overview:description")} />
      <QueryView
        query={pipes}
        label={t("overview:loading")}
        skeleton={
          <div className={styles.pipes}>
            <Skeleton shape="block" />
            <Skeleton shape="block" />
          </div>
        }
      >
        {(data) => (
          <div className={styles.pipes}>
            {data.items.map((pipe, index) => (
              <PipeOverviewCard key={pipe.pipe_id} pipe={pipe} motionIndex={index} />
            ))}
          </div>
        )}
      </QueryView>
      {shown === undefined ? null : (
        <Card
          motionIndex={2}
          title={t("overview:mapTitle")}
          description={t("overview:mapDescription")}
          actions={<PipeSwitch pipes={items} current={shown.pipe_id} onChange={setMapPipe} />}
        >
          <QueryView
            query={network}
            label={t("pipe:loadingMap")}
            skeleton={<Skeleton shape="block" />}
          >
            {(lines) => (
              <QueryView
                query={profile}
                label={t("pipe:loading")}
                skeleton={<Skeleton shape="block" />}
              >
                {(rows) => (
                  <RouteMap
                    lines={lines.lines}
                    pipeId={shown.pipe_id}
                    rows={rows.rows}
                    nominal={rows.nominal_wall_mm}
                    thinnest={shown.thinnest_mm}
                    selected={shown.thinnest_segment_id}
                    focus="network"
                    height={420}
                  />
                )}
              </QueryView>
            )}
          </QueryView>
          <p className={styles.caption}>{t("route:caption")}</p>
        </Card>
      )}
    </div>
  )
}
