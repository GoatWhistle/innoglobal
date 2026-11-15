import { useEffect, useRef } from "react"
import type { Profile } from "@/entities/pipe"
import { useThickness } from "@/entities/pipe"
import { useTranslation } from "@/shared/i18n"
import { useTheme } from "@/shared/theme"
import { Card } from "@/shared/ui"
import styles from "./unroll-grid.module.css"
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
    { theme } = useTheme()
  const canvas = useRef<HTMLCanvasElement>(null)
  const columns = useRef(50)
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
      const height = Math.ceil(profile.rows.length / columns.current) * 24
      const ratio = window.devicePixelRatio
      element.width = width * ratio
      element.height = height * ratio
      element.style.height = `${height}px`
      const ctx = element.getContext("2d")
      if (!ctx) return
      ctx.scale(ratio, ratio)
      const tokens = getComputedStyle(element),
        cell = width / columns.current
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
        const x = (index % columns.current) * cell,
          y = Math.floor(index / columns.current) * 24
        ctx.fillStyle = tokens.getPropertyValue(`--wall-${level}`)
        ctx.fillRect(x + 2, y + 2, cell - 4, 20)
        if (item.segment_id === selected) {
          ctx.strokeStyle = tokens.getPropertyValue("--text-primary")
          ctx.lineWidth = 2
          ctx.strokeRect(x + 1, y + 1, cell - 2, 22)
        }
      })
    }
    const observer = new ResizeObserver(draw)
    observer.observe(element)
    draw()
    return () => observer.disconnect()
  }, [profile, selected, min, theme])
  return (
    <section className={styles.surface}>
      <header>
        <Card appearance="plain" title={t("variants:workspace.surface")}>
          {null}
        </Card>
        <span>{t("variants:workspace.cell")}</span>
      </header>
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
          const box = event.currentTarget.getBoundingClientRect()
          const index =
            Math.floor((event.clientY - box.top) / 24) * columns.current +
            Math.floor((event.clientX - box.left) / (box.width / columns.current))
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
          const item = profile.rows[Math.max(0, Math.min(profile.rows.length - 1, index + offset))]
          if (item) onSelect(item.segment_id)
        }}
      />
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
