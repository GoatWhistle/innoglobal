import { useEffect, useMemo, useRef, useState } from "react"
import { PipeCard, type PipeList } from "@/entities/pipe"
import { type Network, useNetwork } from "@/entities/reference"
import { useTranslation } from "@/shared/i18n"
import { useTheme } from "@/shared/theme"
import { IconButton, QueryView, Skeleton } from "@/shared/ui"
import { drawMap, type MapLine, nearestLine } from "./map-drawing"
import {
  centerOf,
  countryView,
  fitBounds,
  project,
  scaleOf,
  toWorld,
  type View,
} from "./map-geometry"
import { MapLocator } from "./map-locator"
import { MapLegend, MapPipes } from "./map-pipes"
import styles from "./pipeline-map.module.css"
import { useMapLabels } from "./use-map-labels"
import { useMapView } from "./use-map-view"

const HIT_PX = 10
const DRAG_PX = 4

interface Drag {
  readonly x: number
  readonly y: number
  readonly view: View
  moved: boolean
}

interface Hover {
  readonly id: number
  readonly x: number
  readonly y: number
}

export function PipelineMap({ pipes }: { readonly pipes: PipeList }) {
  const { t } = useTranslation()
  const network = useNetwork()
  return (
    <QueryView query={network} label={t("variants:loading")} skeleton={<Skeleton shape="block" />}>
      {(data) => <MapStage pipes={pipes} network={data} />}
    </QueryView>
  )
}

function MapStage({ pipes, network }: { readonly pipes: PipeList; readonly network: Network }) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const labels = useMapLabels()
  const canvas = useRef<HTMLCanvasElement>(null)
  const drag = useRef<Drag | null>(null)
  const lines = useMemo<MapLine[]>(() => {
    const products = new Set(pipes.items.map((pipe) => pipe.pipe_id))
    return network.lines.map((line) => ({
      pipe_id: line.pipe_id,
      direction: line.direction,
      product: products.has(line.pipe_id),
      projected: line.points.map((p) => project(p[1], p[2])),
    }))
  }, [network, pipes])
  const field = useMemo(
    () =>
      fitBounds(
        lines.flatMap((line) => line.projected),
        1.3,
      ),
    [lines],
  )
  const map = useMapView(field, canvas)
  const [selected, setSelected] = useState(pipes.items[0]?.pipe_id)
  const [hover, setHover] = useState<Hover | null>(null)
  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const draw = () => {
      void theme
      drawMap(element, { view: map.view, lines, selected, hovered: hover?.id, labels })
    }
    const observer = new ResizeObserver(draw)
    observer.observe(element)
    draw()
    return () => observer.disconnect()
  }, [map.view, lines, selected, hover?.id, labels, theme])
  const select = (id: number) => {
    setSelected(id)
    const line = lines.find((item) => item.pipe_id === id)
    if (line) map.animateTo(fitBounds(line.projected, 4))
  }
  const hit = (clientX: number, clientY: number) => {
    const element = canvas.current
    if (!element) return undefined
    const box = element.getBoundingClientRect()
    const point = toWorld(map.view, box, clientX, clientY)
    return nearestLine(lines, point, HIT_PX / scaleOf(map.view, box))
  }
  const pipe = pipes.items.find((item) => item.pipe_id === selected)
  const hovered = lines.find((line) => line.pipe_id === hover?.id)
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <MapPipes pipes={pipes} selected={selected} onSelect={select} />
        {pipe ? <PipeCard pipe={pipe} /> : null}
        <div className={styles.context}>
          <MapLegend />
          <MapLocator
            focus={centerOf(field)}
            label={t("variants:workspace.mapLocator")}
            onClick={() => map.animateTo(countryView)}
          />
        </div>
      </aside>
      <div className={styles.stage}>
        <canvas
          ref={canvas}
          className={styles.canvas}
          data-hover={hover !== null || undefined}
          aria-label={t("variants:workspace.map")}
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, y: e.clientY, view: map.view, moved: false }
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            const current = drag.current
            if (current) {
              const dx = e.clientX - current.x
              const dy = e.clientY - current.y
              if (Math.hypot(dx, dy) > DRAG_PX) current.moved = true
              if (current.moved)
                map.pan(
                  current.view,
                  dx,
                  dy,
                  scaleOf(current.view, e.currentTarget.getBoundingClientRect()),
                )
              return
            }
            const id = hit(e.clientX, e.clientY)
            const box = e.currentTarget.getBoundingClientRect()
            setHover(
              id === undefined ? null : { id, x: e.clientX - box.left, y: e.clientY - box.top },
            )
          }}
          onPointerUp={(e) => {
            const current = drag.current
            drag.current = null
            if (!current || current.moved) return
            const id = hit(e.clientX, e.clientY)
            if (id !== undefined && pipes.items.some((item) => item.pipe_id === id)) select(id)
          }}
          onPointerCancel={() => {
            drag.current = null
          }}
          onPointerLeave={() => setHover(null)}
        />
        {hovered && hover ? (
          <output
            className={styles.tip}
            style={{ insetInlineStart: hover.x, insetBlockStart: hover.y }}
          >
            <strong>{hovered.direction}</strong>
            <span>{hovered.product ? hovered.pipe_id : t("variants:workspace.mapNoForecast")}</span>
          </output>
        ) : null}
        <div className={styles.controls}>
          <IconButton
            icon="plus"
            label={t("variants:workspace.zoomIn")}
            onClick={() => map.zoomBy(0.6)}
          />
          <IconButton
            icon="minus"
            label={t("variants:workspace.zoomOut")}
            onClick={() => map.zoomBy(1.6)}
          />
          <IconButton
            icon="expand"
            label={t("variants:workspace.mapFit")}
            onClick={() => map.animateTo(field)}
          />
        </div>
      </div>
    </div>
  )
}
