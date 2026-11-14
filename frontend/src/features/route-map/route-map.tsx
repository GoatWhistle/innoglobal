import { type MouseEvent, useMemo, useRef, useState } from "react"
import { type SegmentRow, useThickness, wallColor, wallStep } from "@/entities/pipe"
import type { RouteLine } from "@/entities/reference"
import { useElementWidth } from "@/shared/hooks"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { linePath, project, type RoutePoint, scaleBar, segmentLines } from "./projection"
import styles from "./route-map.module.css"

export type RouteFocus = "pipe" | "network"

export interface RouteMapProps {
  readonly lines: readonly RouteLine[]
  readonly pipeId: number
  readonly rows: readonly SegmentRow[]
  readonly nominal: number
  readonly thinnest: number
  readonly selected: number | null
  readonly focus: RouteFocus
  readonly onSelect?: ((segmentId: number) => void) | undefined
  readonly height?: number
}

const PADDING = 28
const PICK_RADIUS_PX = 24

export function RouteMap({
  lines,
  pipeId,
  rows,
  nominal,
  thinnest,
  selected,
  focus,
  onSelect,
  height = 360,
}: RouteMapProps) {
  const { t } = useTranslation()
  const format = useFormatters()
  const thickness = useThickness()
  const frame = useRef<HTMLDivElement>(null)
  const width = useElementWidth(frame, 640)
  const [hover, setHover] = useState<number | null>(null)
  const route = lines.find((line) => line.pipe_id === pipeId)
  const focusPoints: RoutePoint[] = useMemo(
    () => (focus === "pipe" && route ? route.points : lines.flatMap((line) => line.points)),
    [focus, route, lines],
  )
  const projection = useMemo(
    () => project(focusPoints, width, height, PADDING),
    [focusPoints, width, height],
  )
  const segments = useMemo(
    () => (route ? segmentLines(rows, route, projection) : []),
    [rows, route, projection],
  )
  const bar = scaleBar(projection.metersPerPixel, width / 4)

  const nearest = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - rect.left
    const py = event.clientY - rect.top
    let best: number | null = null
    let distance = PICK_RADIUS_PX ** 2
    for (const item of segments) {
      const dx = (item.from[0] + item.to[0]) / 2 - px
      const dy = (item.from[1] + item.to[1]) / 2 - py
      if (dx * dx + dy * dy < distance) {
        distance = dx * dx + dy * dy
        best = item.segmentId
      }
    }
    return best
  }

  const marked = segments.find((item) => item.segmentId === selected)
  const preview = segments.find((item) => item.segmentId === hover)
  const start = segments[0]
  const end = segments.at(-1)
  return (
    <div ref={frame} className={styles.frame}>
      <svg
        className={styles.svg}
        width={width}
        height={height}
        role="img"
        aria-label={t("route:label", { pipe: pipeId })}
        onPointerMove={onSelect ? (event) => setHover(nearest(event)) : undefined}
        onPointerLeave={() => setHover(null)}
        tabIndex={onSelect ? 0 : undefined}
        onKeyDown={(event) => {
          if (!onSelect) return
          const choices: Record<string, number> = {
            Home: 0,
            End: rows.length - 1,
            ArrowRight: Math.min(rows.length - 1, (selected ?? 0) + 1),
            ArrowLeft: Math.max(0, (selected ?? 0) - 1),
          }
          const next = choices[event.key]
          if (next !== undefined) {
            event.preventDefault()
            onSelect(next)
          }
        }}
        onClick={
          onSelect
            ? (event) => {
                const id = nearest(event)
                if (id !== null) onSelect(id)
              }
            : undefined
        }
      >
        {lines
          .filter((line) => line.pipe_id !== pipeId)
          .map((line) => (
            <path
              key={line.pipe_id}
              className={line.case_id === null ? styles.network : styles.otherTarget}
              d={linePath(line, projection)}
            />
          ))}
        {route ? <path className={styles.casing} d={linePath(route, projection)} /> : null}
        {segments.map((item) => (
          <line
            key={item.segmentId}
            className={styles.segment}
            x1={item.from[0]}
            y1={item.from[1]}
            x2={item.to[0]}
            y2={item.to[1]}
            stroke={wallColor(wallStep(item.forecast, nominal, thinnest))}
          />
        ))}
        {start ? (
          <circle className={styles.end} cx={start.from[0]} cy={start.from[1]} r={4} />
        ) : null}
        {end ? (
          <rect className={styles.end} x={end.to[0] - 4} y={end.to[1] - 4} width={8} height={8} />
        ) : null}
        {preview && preview !== marked ? (
          <circle className={styles.preview} cx={preview.from[0]} cy={preview.from[1]} r={8} />
        ) : null}
        {marked ? (
          <g>
            <circle className={styles.ring} cx={marked.from[0]} cy={marked.from[1]} r={11} />
            <circle className={styles.core} cx={marked.from[0]} cy={marked.from[1]} r={3} />
          </g>
        ) : null}
        <g transform={`translate(${PADDING} ${height - 14})`}>
          <line className={styles.bar} x1={0} x2={bar / projection.metersPerPixel} y1={0} y2={0} />
          <text className={styles.barLabel} x={0} y={-6}>
            {bar >= 1000
              ? t("pipe:unit.km", { value: format.number(bar / 1000, 0) })
              : t("pipe:unit.m", { value: format.integer(bar) })}
          </text>
        </g>
      </svg>
      {preview ? (
        <p className={styles.hint} aria-live="polite">
          {t("route:hover", {
            segment: preview.segmentId,
            value: thickness.withUnit(preview.forecast),
          })}
        </p>
      ) : null}
    </div>
  )
}
