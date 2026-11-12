import { drawBalloons, drawDetection, drawFronts, drawLeak, drawTitle, m10 } from "./annotate.js"
import { centreLine, font, hatchPath, hatchRect, line, renderGrid } from "./sketch.js"
import { P_RANGE, SAMPLES, SEGMENT_M, SENSORS_M } from "./sim.js"

const LANES = [
  [-0.64, [54, 26, 18, 34]],
  [-0.3, [80, 30, 26, 22]],
  [0.3, [36, 22, 64, 30]],
  [0.64, [70, 34, 22, 26]],
]

function layoutFor(w, h) {
  if (w / h < 0.85) {
    const pipeY = h * 0.585
    const r = 11
    const ground = pipeY + r + 22
    const dim = ground + 30
    return {
      portrait: true, x0: 28, x1: w - 28, gTop: h * 0.335, gBot: h * 0.495, pipeY, r, wall: 4,
      ground, dim, font: 10, clamp: 6, balloon: 6.5, labelShelf: ground + 22, chainY: h * 0.495 + 16,
      title: { x: 28, y: dim + 54, w: w - 56 },
    }
  }
  const pipeY = h * 0.505
  const r = 27
  const ground = pipeY + r + 30
  const dim = ground + 40
  return {
    portrait: false, x0: 120, x1: w - 120, gTop: h * 0.18, gBot: h * 0.385, pipeY, r, wall: 7,
    ground, dim, font: 12, clamp: 10, balloon: 8, labelShelf: ground + 28, chainY: h * 0.385 + 22,
    title: { x: w - 40 - 400, y: h - 40 - 28 - 88 - 12, w: 400 },
  }
}

export function createDrawing({ canvas, sim, ease }) {
  const ctx = canvas.getContext("2d")
  const grid = document.createElement("canvas")
  let theme = null
  let L = layoutFor(1, 1)
  let size = { w: 1, h: 1 }
  let revealAt = 0
  const flow = { up: 0, down: 0 }
  const leak = { x: 0, at: 0, fade: 0, active: false, resetAt: null }
  let detectAt = null

  const toX = (m) => L.x0 + (m / SEGMENT_M) * (L.x1 - L.x0)
  const toY = (p) => L.gBot - ((p - P_RANGE[0]) / (P_RANGE[1] - P_RANGE[0])) * (L.gBot - L.gTop)

  function sweep(progress, draw, from = 0, to = size.w) {
    if (progress <= 0) return
    ctx.save()
    ctx.beginPath()
    ctx.rect(from, 0, (to - from) * progress, size.h)
    ctx.clip()
    draw()
    ctx.restore()
  }

  function graph(c, s, levels) {
    const xs = (i) => L.x0 + (i / (SAMPLES - 1)) * (L.x1 - L.x0)
    ctx.lineWidth = s.thin
    ctx.strokeStyle = c.warn
    hatchPath(
      ctx,
      (p) => {
        for (let i = 0; i < SAMPLES; i++) p.lineTo(xs(i), toY(sim.model[i]))
        for (let i = SAMPLES - 1; i >= 0; i--) {
          const gap = sim.model[i] - sim.measured[i] > 0.02 ? sim.measured[i] : sim.model[i]
          p.lineTo(xs(i), toY(gap))
        }
      },
      { x: L.x0, y: L.gTop - 10, w: L.x1 - L.x0, h: L.gBot - L.gTop + 20 },
      s.hatch,
    )
    for (const [series, width] of [
      [sim.model, s.thin],
      [sim.measured, s.thick],
    ]) {
      ctx.strokeStyle = c.ink
      ctx.lineWidth = width
      ctx.beginPath()
      for (let i = 0; i < SAMPLES; i++) ctx.lineTo(xs(i), toY(series[i]))
      ctx.stroke()
    }
    sim.sensors.forEach((sensor, i) => {
      const f = (sensor.x / SEGMENT_M) * (SAMPLES - 1)
      const j = Math.min(Math.floor(f), SAMPLES - 2)
      const p = sim.measured[j] + (sim.measured[j + 1] - sim.measured[j]) * (f - j)
      ctx.beginPath()
      ctx.arc(toX(sensor.x), toY(p), L.portrait ? 2.6 : 3.2, 0, Math.PI * 2)
      ctx.fillStyle = levels[i] > 1.5 ? c.leak : levels[i] > 0.5 ? c.warn : c.paper
      ctx.fill()
      ctx.lineWidth = s.thin
      ctx.strokeStyle = c.ink
      ctx.stroke()
    })
  }

  function graphText(c) {
    ctx.fillStyle = c.muted
    ctx.font = font(L.font - 1)
    ctx.textBaseline = "middle"
    if (L.portrait) {
      ctx.textAlign = "left"
      ctx.strokeStyle = c.ink
      const y = L.dim + 34
      ctx.lineWidth = 0.75
      line(ctx, L.x0, y, L.x0 + 16, y)
      ctx.fillText("модель", L.x0 + 22, y)
      ctx.lineWidth = 1.75
      line(ctx, L.x0 + 74, y, L.x0 + 90, y)
      ctx.fillText("замер", L.x0 + 96, y)
      return
    }
    ctx.textAlign = "right"
    const ax = L.x0 - 18
    ctx.strokeStyle = c.ink
    ctx.lineWidth = 0.75
    line(ctx, ax, L.gTop - 8, ax, L.gBot)
    for (const p of [4, 4.5, 5]) {
      line(ctx, ax - 4, toY(p), ax, toY(p))
      ctx.fillText(p.toLocaleString("ru-RU", { minimumFractionDigits: 1 }), ax - 8, toY(p))
    }
    ctx.textAlign = "center"
    ctx.fillText("МПа", ax, L.gTop - 18)
    ctx.textAlign = "left"
    ctx.fillText("модель", L.x1 + 10, toY(sim.model[SAMPLES - 1]) - 7)
    ctx.fillText("замер", L.x1 + 10, Math.max(toY(sim.measured[SAMPLES - 1]), toY(sim.model[SAMPLES - 1]) + 7) + 7)
  }

  function construction(c, s) {
    ctx.strokeStyle = c.construction
    ctx.lineWidth = 0.5
    for (const p of [4, 4.5, 5]) line(ctx, L.x0 - 18, toY(p), L.x1 + 40, toY(p))
    ctx.save()
    ctx.setLineDash([2, 3])
    for (const m of SENSORS_M) line(ctx, toX(m), L.gTop - 6, toX(m), L.dim + 6)
    ctx.restore()
    line(ctx, L.x0 - 40, L.pipeY - L.r, L.x1 + 40, L.pipeY - L.r)
  }

  function pipe(c, s, levels, now) {
    const { x0, x1, pipeY: y, r, wall } = L
    ctx.fillStyle = c.ink
    ctx.fillRect(x0, y - r + wall, x1 - x0, (r - wall) * 2)
    const split = leak.active ? toX(sim.leak?.x ?? SEGMENT_M) : x1
    ctx.strokeStyle = c.paper
    ctx.lineWidth = 0.75
    LANES.forEach(([k, dash], i) => {
      const ly = y + k * (r - wall)
      for (const [from, to, off] of [
        [x0, split, flow.up],
        [split, x1, flow.down],
      ]) {
        if (to <= from) continue
        ctx.save()
        ctx.globalAlpha = 0.42 + 0.08 * i
        ctx.setLineDash(dash)
        ctx.lineDashOffset = -off * (1 + i * 0.12)
        line(ctx, from, ly, to, ly)
        ctx.restore()
      }
    })
    ctx.strokeStyle = c.ink
    ctx.lineWidth = s.thin
    hatchRect(ctx, x0, y - r, x1 - x0, wall, s.hatch)
    hatchRect(ctx, x0, y + r - wall, x1 - x0, wall, s.hatch)
    line(ctx, x0, y - r + wall, x1, y - r + wall)
    line(ctx, x0, y + r - wall, x1, y + r - wall)
    ctx.lineWidth = s.outline
    line(ctx, 0, y - r, size.w, y - r)
    line(ctx, 0, y + r, size.w, y + r)
    line(ctx, x0, y - r, x0, y + r)
    line(ctx, x1, y - r, x1, y + r)
    ctx.lineWidth = s.thin
    ctx.strokeStyle = c.paper
    ctx.globalAlpha = 0.5
    centreLine(ctx, x0 + 2, x1 - 2, y, L.portrait ? 0.6 : 1)
    ctx.globalAlpha = 1
    ctx.strokeStyle = c.ink
    centreLine(ctx, 8, x0 - 2, y, L.portrait ? 0.6 : 1)
    centreLine(ctx, x1 + 2, size.w - 8, y, L.portrait ? 0.6 : 1)
    if (leak.active || leak.fade > 0) {
      const lx = toX(leak.x)
      ctx.globalAlpha = leak.fade
      ctx.fillStyle = c.paper
      ctx.fillRect(lx - 2.5, y + r - wall - 0.5, 5, wall + 1)
      ctx.globalAlpha = 1
    }
    SENSORS_M.forEach((m, i) => {
      const x = toX(m)
      const level = levels[i]
      ctx.fillStyle = level > 1.5 ? c.leak : level > 0.5 ? c.warn : c.paper
      ctx.fillRect(x - L.clamp / 2, y - r - 3, L.clamp, r * 2 + 6)
      ctx.strokeStyle = c.ink
      ctx.lineWidth = s.outline
      ctx.strokeRect(x - L.clamp / 2, y - r - 3, L.clamp, r * 2 + 6)
      ctx.lineWidth = s.thin
      line(ctx, x - L.clamp / 2 + 1, y + r + 3, x - L.clamp, L.ground)
      line(ctx, x + L.clamp / 2 - 1, y + r + 3, x + L.clamp, L.ground)
      line(ctx, x - L.clamp * 1.6, L.ground, x + L.clamp * 1.6, L.ground)
    })
  }

  function groundAndDims(c, s) {
    ctx.strokeStyle = c.ink
    ctx.lineWidth = s.thin
    line(ctx, L.x0 - 60, L.ground, L.x1 + 60, L.ground)
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    for (let x = L.x0 - 56; x < L.x1 + 56; x += 9) {
      ctx.moveTo(x, L.ground + 1)
      ctx.lineTo(x - 6, L.ground + 7)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.strokeStyle = c.dimension
    ctx.fillStyle = c.dimension
    line(ctx, L.x0, L.dim, L.x1, L.dim)
    ctx.font = font(L.font - (L.portrait ? 1 : 0))
    ctx.textBaseline = "top"
    SENSORS_M.forEach((m, i) => {
      const x = toX(m)
      line(ctx, x, L.ground + 10, x, L.dim + 5)
      line(ctx, x - 4, L.dim + 4, x + 4, L.dim - 4)
      ctx.textAlign = i === 0 ? "left" : i === SENSORS_M.length - 1 ? "right" : "center"
      const label = i === SENSORS_M.length - 1 ? `${m10(m)} м` : m10(m)
      ctx.fillText(label, x + (i === 0 ? -2 : i === SENSORS_M.length - 1 ? 2 : 0), L.dim + 8)
    })
  }

  function hoverMark(c, hover) {
    if (hover.on < 0.02) return
    const x = toX(hover.m)
    ctx.globalAlpha = hover.on
    ctx.strokeStyle = c.ink
    ctx.lineWidth = 0.75
    ctx.save()
    ctx.setLineDash([3, 3])
    line(ctx, x, L.gTop - 4, x, L.ground)
    ctx.restore()
    ctx.fillStyle = c.ink
    ctx.font = font(L.font)
    ctx.textAlign = "center"
    ctx.textBaseline = "bottom"
    ctx.fillText(`${m10(hover.m)} м`, x, L.gTop - 8)
    ctx.globalAlpha = 1
  }

  return {
    resize(w, h) {
      size = { w, h }
      const ratio = Math.min(devicePixelRatio, 2)
      canvas.width = Math.round(w * ratio)
      canvas.height = Math.round(h * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      L = layoutFor(w, h)
      if (theme) renderGrid(grid, w, h, ratio, theme.colors.grid, theme.sizes.gridMinor, theme.sizes.gridMajor)
    },
    setTheme(next) {
      theme = next
      const ratio = Math.min(devicePixelRatio, 2)
      renderGrid(grid, size.w, size.h, ratio, theme.colors.grid, theme.sizes.gridMinor, theme.sizes.gridMajor)
    },
    replay(clock) {
      revealAt = clock
    },
    pick(event) {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      if (x < L.x0 || x > L.x1 || y < L.pipeY - L.r - 16 || y > L.ground + 4) return null
      return ((x - L.x0) / (L.x1 - L.x0)) * SEGMENT_M
    },
    insert(m, clock) {
      Object.assign(leak, { x: m, at: clock, fade: 1, active: true, resetAt: null })
      detectAt = null
    },
    reset(clock) {
      leak.active = false
      leak.resetAt = clock
    },
    render({ clock, dt, hover, reduced, durations, levels }) {
      const c = theme.colors
      const s = theme.sizes
      const rv = (start, dur) => (reduced ? 1 : ease(Math.min(Math.max((clock - revealAt - start) / dur, 0), 1)))
      const [upShare, downShare] = sim.flowShare()
      const speed = (reduced ? 8 : 34) * (L.portrait ? 0.7 : 1)
      flow.up += dt * speed * upShare
      flow.down += dt * speed * downShare
      if (!leak.active && leak.resetAt !== null) {
        leak.fade = 1 - ease(Math.min((clock - leak.resetAt) / durations.long, 1))
      }
      if (sim.detection && detectAt === null) detectAt = clock
      if (!sim.detection) detectAt = null
      L.fade = leak.fade

      ctx.fillStyle = c.paper
      ctx.fillRect(0, 0, size.w, size.h)
      ctx.globalAlpha = rv(0, 0.9)
      ctx.drawImage(grid, 0, 0, size.w, size.h)
      ctx.globalAlpha = 1
      ctx.lineCap = "butt"
      sweep(rv(0.1, 1.6), () => construction(c, s))
      sweep(rv(0.5, 1.4), () => graph(c, s, levels), L.x0, L.x1)
      ctx.globalAlpha = rv(1.2, 0.6)
      graphText(c)
      ctx.globalAlpha = 1
      sweep(rv(0, 1.2), () => pipe(c, s, levels, clock))
      sweep(rv(0.4, 1.2), () => groundAndDims(c, s))
      ctx.globalAlpha = rv(1.3, 0.6)
      drawBalloons(ctx, L, sim.sensors, c, s, toX, levels)
      drawTitle(ctx, L, sim.model, c, s)
      ctx.globalAlpha = 1
      hoverMark(c, hover)
      if (leak.fade > 0.001) {
        drawFronts(ctx, L, sim.leak ? sim.fronts() : null, c, s, (m) => toX(m))
        drawLeak(ctx, L, { x: toX(leak.x), age: clock - leak.at, fade: leak.fade }, c, s, ease)
        if (sim.detection && detectAt !== null) {
          const pair = sim.detection.pair.map((id) => sim.sensors[id - 1]).sort((a, b) => a.x - b.x)
          drawDetection(ctx, L, sim.detection, c, s, ease, clock - detectAt, toX, pair)
        }
      }
    },
  }
}
