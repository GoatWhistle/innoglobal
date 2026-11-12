import { balloon, dimension, font, line, sketchCircle, stipple, titleBlock } from "./sketch.js"
import { DIAMETER, SEGMENT_M } from "./sim.js"

const meters = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 })
const pressure = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const date = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })

export function m10(value) {
  return meters.format(Math.round(value / 10) * 10)
}

function clamp01(v) {
  return Math.min(Math.max(v, 0), 1)
}

export function drawFronts(ctx, L, fronts, colors, sizes, toX) {
  if (!fronts) return
  ctx.strokeStyle = colors.leak
  ctx.lineWidth = sizes.outline
  fronts.forEach((front, i) => {
    const dir = i === 0 ? -1 : 1
    const x = toX(front.x)
    if (front.strength <= 0.01 || x < L.x0 - 4 || x > L.x1 + 4) return
    for (let k = 0; k < 3; k++) {
      ctx.globalAlpha = front.strength * (1 - k * 0.32) * L.fade
      const cx = x - dir * (k * L.r * 0.4 + L.r * 1.1)
      ctx.beginPath()
      ctx.ellipse(cx, L.pipeY, L.r * 1.1, L.r * 1.6, 0, dir > 0 ? -0.95 : Math.PI - 0.95, dir > 0 ? 0.95 : Math.PI + 0.95)
      ctx.stroke()
    }
  })
  ctx.globalAlpha = 1
}

export function drawLeak(ctx, L, leak, colors, sizes, ease) {
  const { x, age, fade } = leak
  ctx.globalAlpha = fade
  const top = L.pipeY + L.r
  const fall = clamp01(age / 0.45)
  ctx.strokeStyle = colors.leak
  ctx.fillStyle = colors.leak
  ctx.lineWidth = sizes.thick
  ctx.save()
  ctx.setLineDash([5, 3])
  ctx.lineDashOffset = -age * 24
  line(ctx, x, top, x + L.r * 0.15 * fall, top + (L.ground - top) * fall)
  ctx.restore()

  const spread = 1 - Math.exp(-Math.max(age - 0.4, 0) / 3.2)
  const rx = L.r * 5.2 * spread
  const ry = Math.min(L.r * 0.42, 10) * spread
  if (rx > 1) {
    ctx.lineWidth = sizes.thin
    ctx.beginPath()
    ctx.ellipse(x, L.ground, rx, ry, 0, Math.PI, Math.PI * 2)
    ctx.stroke()
    stipple(ctx, x, L.ground - 0.5, rx * 0.96, ry * 0.9, Math.floor(rx * 3), 7, 0.55)
  }

  ctx.lineWidth = sizes.outline
  sketchCircle(ctx, x, top - L.wall * 0.5, L.r * 0.75, ease(clamp01((age - 0.05) / 0.6)), 2)
  const leader = ease(clamp01((age - 0.5) / 0.4))
  if (leader > 0) {
    const sx = x - L.r * 0.85
    const sy = top + L.r * 0.35
    const ex = sx - (L.r * 1.6 + 6) * leader
    const ey = sy + (L.labelShelf - sy) * leader
    ctx.lineWidth = sizes.thin
    line(ctx, sx, sy, ex, ey)
    if (leader >= 1) {
      line(ctx, ex, ey, ex - L.font * 2.8, ey)
      ctx.font = font(L.font)
      ctx.textAlign = "right"
      ctx.textBaseline = "bottom"
      ctx.fillText("течь", ex - 2, ey - 3)
    }
  }
  ctx.globalAlpha = 1
}

export function drawDetection(ctx, L, found, colors, sizes, ease, k, toX, pair) {
  const x = toX(found.x)
  ctx.globalAlpha = L.fade
  ctx.strokeStyle = colors.leak
  ctx.fillStyle = colors.leak
  ctx.lineWidth = sizes.thin
  const drop = ease(clamp01(k / 0.6))
  line(ctx, x, L.gTop - L.font * 1.6, x, L.gTop - L.font * 1.6 + (L.ground - L.gTop + L.font * 1.6) * drop)

  const tick = ease(clamp01((k - 0.2) / 0.7))
  ctx.font = font(L.font + 1, 500)
  ctx.textAlign = "center"
  ctx.textBaseline = "bottom"
  ctx.fillText(`${m10(found.x * tick)} м`, x, L.gTop - L.font * 2)

  const half = Math.max((found.spread / SEGMENT_M) * (L.x1 - L.x0), 4)
  const by = L.gTop - L.font * 0.8
  line(ctx, x - half, by, x + half, by)
  line(ctx, x - half, by, x - half, by + 4)
  line(ctx, x + half, by, x + half, by + 4)
  ctx.font = font(L.font - 1)
  ctx.textAlign = "left"
  ctx.textBaseline = "middle"
  ctx.fillText(`±${m10(found.spread)} м`, x + half + 5, by + 1)

  const chain = ease(clamp01((k - 0.35) / 0.8))
  if (chain > 0 && pair.length === 2) {
    const [a, b] = pair.map((s) => toX(s.x))
    const xa = a + (x - a) * chain
    const xb = b + (x - b) * chain
    const style = { color: colors.leak, text: font(L.font - 1), size: 3.5 }
    dimension(ctx, a, xa, L.chainY, chain >= 1 ? m10((found.x - pair[0].x) * tick) : "", style)
    dimension(ctx, xb, b, L.chainY, chain >= 1 ? m10((pair[1].x - found.x) * tick) : "", style)
  }
  ctx.globalAlpha = 1
}

export function drawBalloons(ctx, L, sensors, colors, sizes, toX, levels) {
  ctx.lineWidth = sizes.thin
  sensors.forEach((s, i) => {
    const x = toX(s.x)
    const bx = x + L.balloon * 1.9
    const by = L.pipeY - L.r - L.balloon * 2.6
    ctx.strokeStyle = colors.ink
    line(ctx, x + L.clamp / 2, L.pipeY - L.r - 3, bx - L.balloon * 0.7, by + L.balloon * 0.7)
    const level = levels[i]
    const fill = level > 1.5 ? colors.leak : level > 0.5 ? colors.warn : null
    balloon(ctx, bx, by, L.balloon, String(i + 1), {
      ink: colors.ink,
      paper: colors.paper,
      fill,
      text: font(L.balloon + 1.5, 500),
    })
  })
}

export function drawTitle(ctx, L, model, colors, sizes) {
  if (!L.title) return
  const scale = Math.round(SEGMENT_M / ((L.x1 - L.x0) * 0.0002646) / 1000) * 1000
  const style = {
    ink: colors.ink,
    muted: colors.muted,
    text: font(L.font, 500),
    small: font(L.font - 1),
    line: sizes.thin,
  }
  const rows = L.portrait
    ? [
        [["участок", `${m10(SEGMENT_M)} м`], ["вход", `${pressure.format(model[0])} МПа`]],
        [["масштаб", `1 : ${m10(scale)}`], ["дата", date.format(new Date())]],
      ]
    : [
        [["", "PipeTwin, участок трубопровода"]],
        [["длина", `${m10(SEGMENT_M)} м`], ["труба", `DN ${Math.round(DIAMETER * 1000 / 50) * 50}`]],
        [["давление на входе", `${pressure.format(model[0])} МПа`], ["масштаб", `1 : ${m10(scale)}`]],
        [["дата", date.format(new Date())], ["лист", "1"]],
      ]
  titleBlock(ctx, L.title.x, L.title.y, L.title.w, rows, style)
}
