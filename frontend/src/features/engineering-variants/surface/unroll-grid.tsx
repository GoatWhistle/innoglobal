import { useEffect, useRef } from "react"
import type { Profile } from "@/entities/pipe"
import { useThickness } from "@/entities/pipe"
import { useFormatters, useTranslation } from "@/shared/i18n"
import { useTheme } from "@/shared/theme"
import { Card } from "@/shared/ui"
import styles from "./unroll-grid.module.css"

const GUTTER = 64
const MIN_ROW = 18
const STEPS = [0, 1, 2, 3, 4, 5, 6, 7] as const
export function UnrollGrid({
  profile,
  selected,
  onSelect,
}: {
  readonly profile: Profile
  readonly selected: number | null
  readonly onSelect: (id: number) => void
}) {
  const { t } = useTranslation(),
    thickness = useThickness(),
    format = useFormatters(),
    { theme } = useTheme()
  const canvas = useRef<HTMLCanvasElement>(null)
  const columns = useRef(50)
  const rowHeight = useRef(MIN_ROW)
  const box = useRef<HTMLDivElement>(null)
  const min = Math.min(...profile.rows.map((row) => row.forecast_mm))
  const row = profile.rows.find((item) => item.segment_id === selected)
  const label = row
    ? `${thickness.range(row.start_m, row.end_m)} / ${thickness.withUnit(row.forecast_mm)}`
    : t("variants:workspace.cell")
  useEffect(() => {
    void theme
    const element = canvas.current
    if (!element) return
    const draw = () => {
      const width = element.clientWidth
      columns.current = width < 480 ? 20 : 50
      const rows = Math.ceil(profile.rows.length / columns.current)
      const room = box.current?.clientHeight ?? 0
      const ROW = Math.max(MIN_ROW, Math.floor(room / rows))
      rowHeight.current = ROW
      const height = rows * ROW
      const ratio = window.devicePixelRatio
      element.width = width * ratio
      element.height = height * ratio
      element.style.height = `${height}px`
      const ctx = element.getContext("2d")
      if (!ctx) return
      ctx.scale(ratio, ratio)
      const tokens = getComputedStyle(element),
        cell = (width - GUTTER) / columns.current
      ctx.fillStyle = tokens.getPropertyValue("--text-muted")
      ctx.font = `11px ${tokens.getPropertyValue("--font-sans")}`
      ctx.textBaseline = "middle"
      for (let line = 0; line < rows; line++) {
        const first = profile.rows[line * columns.current]
        if (first)
          ctx.fillText(
            t("pipe:unit.m", { value: format.number(first.start_m, 0) }),
            0,
            line * ROW + ROW / 2,
          )
      }
      profile.rows.forEach((item, index) => {
        const level = Math.max(
          0,
          Math.min(
            7,
            Math.round(
              ((profile.nominal_wall_mm - item.forecast_mm) /
                Math.max(0.01, profile.nominal_wall_mm - min)) *
                7,
            ),
          ),
        )
        const x = GUTTER + (index % columns.current) * cell,
          y = Math.floor(index / columns.current) * ROW
        ctx.fillStyle = tokens.getPropertyValue(`--wall-${level}`)
        ctx.fillRect(x + 1, y + 1, cell - 2, ROW - 2)
        if (item.segment_id === selected) {
          ctx.strokeStyle = tokens.getPropertyValue("--text-primary")
          ctx.lineWidth = 2
          ctx.strokeRect(x + 1, y + 1, cell - 2, ROW - 2)
        }
      })
    }
    const observer = new ResizeObserver(draw)
    observer.observe(element)
    if (box.current) observer.observe(box.current)
    draw()
    return () => observer.disconnect()
  }, [profile, selected, min, theme, t, format])
  return (
    <section className={styles.surface}>
      <header>
        <Card appearance="plain" title={t("variants:workspace.surface")}>
          {null}
        </Card>
        <span>{t("variants:workspace.cell")}</span>
      </header>
      <div className={styles.legend} aria-hidden="true">
        <span>{t("pipe:restoration.nearNominal")}</span>
        <span className={styles.scale}>
          {STEPS.map((step) => (
            <span key={step} data-step={step} />
          ))}
        </span>
        <span>{t("pipe:restoration.thinner")}</span>
      </div>
      <div ref={box} className={styles.gridBox}>
        <canvas
          ref={canvas}
          className={styles.grid}
          tabIndex={0}
          role="slider"
          aria-label={t("variants:workspace.surface")}
          aria-valuemin={0}
          aria-valuemax={profile.rows.length - 1}
          aria-valuenow={selected ?? 0}
          aria-valuetext={label}
          title={label}
          onPointerDown={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            const index =
              Math.floor((event.clientY - rect.top) / rowHeight.current) * columns.current +
              Math.floor(
                (event.clientX - rect.left - GUTTER) / ((rect.width - GUTTER) / columns.current),
              )
            const item = profile.rows[index]
            if (item) onSelect(item.segment_id)
          }}
          onKeyDown={(event) => {
            const index = Math.max(
              0,
              profile.rows.findIndex((item) => item.segment_id === selected),
            )
            const offsets: Record<string, number> = {
              ArrowLeft: -1,
              ArrowRight: 1,
              ArrowUp: -columns.current,
              ArrowDown: columns.current,
              Home: -index,
              End: profile.rows.length - 1 - index,
            }
            const offset = offsets[event.key]
            if (offset === undefined) return
            event.preventDefault()
            const item =
              profile.rows[Math.max(0, Math.min(profile.rows.length - 1, index + offset))]
            if (item) onSelect(item.segment_id)
          }}
        />
      </div>
      <footer>
        <span>{label}</span>
        <span>
          {t("pipe:unit.span", {
            from: thickness.withUnit(min),
            to: thickness.withUnit(profile.nominal_wall_mm),
          })}
        </span>
      </footer>
    </section>
  )
}
