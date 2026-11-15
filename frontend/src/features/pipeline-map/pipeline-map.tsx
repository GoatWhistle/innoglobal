import { useEffect, useMemo, useRef, useState } from "react"
import type { PipeList } from "@/entities/pipe"
import { useNetwork } from "@/entities/reference"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { useTheme } from "@/shared/theme"
import { Button, ButtonLink, Card, IconButton, QueryView, Skeleton } from "@/shared/ui"
import { drawMap, nearestLine } from "./map-drawing"
import { countryView, fitBounds, project, type View, zoom } from "./map-geometry"
import styles from "./pipeline-map.module.css"

export function PipelineMap({ pipes }: { readonly pipes: PipeList }) {
  const { t } = useTranslation()
  const format = useFormatters()
  const network = useNetwork()
  const { theme } = useTheme()
  const canvas = useRef<HTMLCanvasElement>(null)
  const [view, setView] = useState(countryView)
  const [selected, setSelected] = useState(pipes.items[0]?.pipe_id)
  const drag = useRef<{ x: number; y: number; view: View } | null>(null)
  const lines = useMemo(
    () =>
      network.data?.lines
        .filter((line) => pipes.items.some((p) => p.pipe_id === line.pipe_id))
        .map((line) => ({ ...line, projected: line.points.map((p) => project(p[1], p[2])) })) ?? [],
    [network.data, pipes],
  )
  const localView = useMemo(() => fitBounds(lines.flatMap((line) => line.projected)), [lines])
  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const draw = () => {
      void theme
      drawMap(element, view, lines, selected)
    }
    const observer = new ResizeObserver(draw)
    observer.observe(element)
    draw()
    return () => {
      observer.disconnect()
    }
  }, [lines, view, selected, theme])
  const pipe = pipes.items.find((p) => p.pipe_id === selected)
  return (
    <section className={styles.fleet}>
      <header>
        <h1>{t("variants:workspace.fleet")}</h1>
        <p>{t("variants:workspace.mapHint")}</p>
      </header>
      <QueryView
        query={network}
        label={t("variants:loading")}
        skeleton={<Skeleton shape="block" />}
      >
        {() => (
          <div className={styles.map}>
            <canvas
              ref={canvas}
              aria-label={t("variants:workspace.map")}
              onPointerDown={(e) => {
                drag.current = { x: e.clientX, y: e.clientY, view }
                e.currentTarget.setPointerCapture(e.pointerId)
              }}
              onPointerUp={() => {
                drag.current = null
              }}
              onPointerCancel={() => {
                drag.current = null
              }}
              onPointerMove={(e) => {
                const box = e.currentTarget.getBoundingClientRect(),
                  scale = Math.min(box.width / view.width, box.height / view.height)
                if (drag.current) {
                  const d = drag.current
                  setView({
                    ...d.view,
                    x: d.view.x - (e.clientX - d.x) / scale,
                    y: d.view.y - (e.clientY - d.y) / scale,
                  })
                  return
                }
                const x = (e.clientX - box.left - box.width / 2) / scale + view.x + view.width / 2,
                  y = (e.clientY - box.top - box.height / 2) / scale + view.y + view.height / 2
                const id = nearestLine(lines, x, y, 14 / scale)
                if (id !== undefined) setSelected(id)
              }}
            />
            <div className={styles.controls}>
              <Button variant="secondary" onClick={() => setView(localView)}>
                {t("variants:workspace.network")}
              </Button>
              <Button variant="quiet" onClick={() => setView(countryView)}>
                {t("variants:workspace.country")}
              </Button>
              <IconButton
                icon="plus"
                label={t("variants:workspace.zoomIn")}
                onClick={() => setView((v) => zoom(v, 0.6))}
              />
              <IconButton
                icon="minus"
                label={t("variants:workspace.zoomOut")}
                onClick={() => setView((v) => zoom(v, 1.6))}
              />
            </div>
            {pipe ? (
              <aside className={styles.readout}>
                <Card appearance="plain" title={pipe.passport.direction}>
                  {null}
                </Card>
                <p>{pipe.pipe_id}</p>
                <dl>
                  <div>
                    <dt>{t("variants:workspace.minimum")}</dt>
                    <dd>
                      {format.number(pipe.thinnest_mm, 2)} {t("pipe:unit.mmShort")}
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
                </dl>
                <ButtonLink to={`/?pipe=${pipe.pipe_id}`}>
                  {t("variants:workspace.open")}
                </ButtonLink>
              </aside>
            ) : null}
          </div>
        )}
      </QueryView>
      <div className={styles.list}>
        {pipes.items.map((pipe) => (
          <Button
            key={pipe.pipe_id}
            variant="quiet"
            aria-pressed={selected === pipe.pipe_id}
            onClick={() => {
              setSelected(pipe.pipe_id)
              setView(localView)
            }}
          >
            {pipe.passport.direction}
          </Button>
        ))}
      </div>
    </section>
  )
}
