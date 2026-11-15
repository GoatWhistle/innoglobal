import type { CSSProperties, KeyboardEvent, ReactNode, RefObject, SVGProps } from "react"
import { useFormatters, useTranslation } from "@/shared/i18n"
import styles from "./chart-frame.module.css"
import { type ChartScale, niceTicks } from "./chart-scale"

export interface ChartFrameProps {
  readonly label: string
  readonly valueText: string
  readonly value: readonly [number, number, number]
  readonly unit: string
  readonly scale: ChartScale
  readonly domain: readonly [number, number]
  readonly range: { readonly from: number; readonly to: number }
  readonly plotRef: RefObject<HTMLDivElement | null>
  readonly digits: number
  readonly signed?: boolean
  readonly svg: SVGProps<SVGSVGElement>
  readonly onKeyDown: (event: KeyboardEvent) => void
  readonly children: ReactNode
}
export function ChartFrame(props: ChartFrameProps) {
  const { t } = useTranslation(),
    format = useFormatters()
  const { scale, domain, range } = props
  const yTicks = niceTicks(domain[0], domain[1], Math.max(3, Math.round(scale.height / 44)))
  const xTicks = niceTicks(range.from, range.to, Math.max(4, Math.round(scale.width / 140)))
  const yLabel = (v: number) =>
    `${props.signed && v > 0 ? "+" : ""}${format.number(v, Math.abs(v) < 1 && v !== 0 ? props.digits : 1)}`
  return (
    <div className={styles.frame}>
      <div className={styles.units}>
        <span>{props.unit}</span>
        <span>{t("variants:dash.distanceAxis")}</span>
      </div>
      <div className={styles.yAxis} aria-hidden="true">
        {yTicks.map((v) => (
          <span key={v} style={{ "--at": `${scale.y(v)}px` } as CSSProperties}>
            {yLabel(v)}
          </span>
        ))}
      </div>
      <div
        ref={props.plotRef}
        className={styles.plot}
        role="slider"
        tabIndex={0}
        aria-label={props.label}
        aria-valuemin={props.value[0]}
        aria-valuemax={props.value[1]}
        aria-valuenow={props.value[2]}
        aria-valuetext={props.valueText}
        onKeyDown={props.onKeyDown}
      >
        <svg
          className={styles.svg}
          width="100%"
          height="100%"
          viewBox={`0 0 ${scale.width} ${scale.height}`}
          aria-hidden="true"
          {...props.svg}
        >
          {yTicks.map((v) => (
            <line
              key={v}
              x1={0}
              x2={scale.width}
              y1={scale.y(v)}
              y2={scale.y(v)}
              className={styles.grid}
            />
          ))}
          {props.children}
        </svg>
      </div>
      <div className={styles.xAxis} aria-hidden="true">
        {xTicks.map((m) => (
          <span key={m} style={{ "--at": `${scale.x(m)}px` } as CSSProperties}>
            {format.integer(m)}
          </span>
        ))}
      </div>
    </div>
  )
}
