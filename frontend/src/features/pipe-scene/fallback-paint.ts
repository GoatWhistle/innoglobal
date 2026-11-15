import { illustrativeThickness, type Profile } from "@/entities/pipe"

export function paintFallback(
  canvas: HTMLCanvasElement,
  profile: Profile,
  mode: string,
  selected: number,
  palette: string,
) {
  canvas.dataset.palette = palette
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const width = canvas.width
  const height = canvas.height
  const left = 44
  const right = width - 18
  const top = mode === "unroll" ? height * 0.28 : height * 0.47
  const bottom = mode === "unroll" ? height * 0.8 : height * 0.65
  const length = profile.rows.at(-1)?.end_m ?? 1
  const nominal = profile.nominal_wall_mm
  const minimum = Math.min(...profile.rows.map((row) => row.forecast_mm))
  const theme = getComputedStyle(canvas)
  ctx.clearRect(0, 0, width, height)
  for (const row of profile.rows) {
    const x = left + (row.start_m / length) * (right - left)
    const next = left + (row.end_m / length) * (right - left)
    const position = (row.start_m + row.end_m) / 2 / length
    for (let band = 0; band < 48; band++) {
      const mm = illustrativeThickness(nominal, row.forecast_mm, position, band / 4)
      const value = Math.max(0, Math.min(1, (nominal - mm) / Math.max(0.01, nominal - minimum)))
      ctx.fillStyle = theme.getPropertyValue(`--wall-${Math.round(value * 7)}`).trim()
      ctx.fillRect(
        x,
        top + (band / 48) * (bottom - top),
        Math.max(1, next - x),
        (bottom - top) / 48 + 1,
      )
    }
  }
  ctx.strokeStyle = theme.getPropertyValue("--text-primary").trim()
  ctx.lineWidth = 1
  ctx.strokeRect(left, top, right - left, bottom - top)
  const row = profile.rows.find((item) => item.segment_id === selected)
  if (!row) return
  const x = left + ((row.start_m + row.end_m) / 2 / length) * (right - left)
  ctx.beginPath()
  ctx.moveTo(x, top - 10)
  ctx.lineTo(x, bottom + 10)
  ctx.stroke()
}
