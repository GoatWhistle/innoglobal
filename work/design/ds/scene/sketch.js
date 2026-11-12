export function font(size, weight = 400) {
  return `${weight} ${size}px "Onest Variable", "Onest", ui-sans-serif, system-ui, sans-serif`
}

export function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

export function hatchRect(ctx, x, y, w, h, gap, angle = 1) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.beginPath()
  for (let s = -h; s < w + h; s += gap) {
    ctx.moveTo(x + s, y + (angle > 0 ? h : 0))
    ctx.lineTo(x + s + h, y + (angle > 0 ? 0 : h))
  }
  ctx.stroke()
  ctx.restore()
}

export function hatchPath(ctx, build, bounds, gap) {
  ctx.save()
  ctx.beginPath()
  build(ctx)
  ctx.clip()
  ctx.beginPath()
  const { x, y, w, h } = bounds
  for (let s = -h; s < w + h; s += gap) {
    ctx.moveTo(x + s, y + h)
    ctx.lineTo(x + s + h, y)
  }
  ctx.stroke()
  ctx.restore()
}

export function tick(ctx, x, y, size) {
  line(ctx, x - size, y + size, x + size, y - size)
}

export function dimension(ctx, xa, xb, y, label, { size = 4, gap = 5, color, text }) {
  ctx.strokeStyle = color
  line(ctx, xa, y, xb, y)
  tick(ctx, xa, y, size)
  tick(ctx, xb, y, size)
  if (!label) return
  ctx.fillStyle = color
  ctx.font = text
  ctx.textAlign = "center"
  ctx.textBaseline = "bottom"
  ctx.fillText(label, (xa + xb) / 2, y - gap)
}

export function balloon(ctx, x, y, r, label, { ink, paper, fill, text }) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = fill || paper
  ctx.fill()
  ctx.strokeStyle = ink
  ctx.stroke()
  ctx.fillStyle = fill && fill !== paper ? paper : ink
  ctx.font = text
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(label, x, y + 0.5)
}

export function sketchCircle(ctx, x, y, r, progress, seed = 1) {
  const end = progress * (Math.PI * 2 + 0.55)
  if (end <= 0) return
  ctx.beginPath()
  const steps = 48
  for (let i = 0; i <= steps; i++) {
    const a = -2.2 + (end * i) / steps
    const wobble = 1 + 0.06 * Math.sin(a * 3 + seed) + 0.04 * (a / (Math.PI * 2))
    const px = x + Math.cos(a) * r * 1.18 * wobble
    const py = y + Math.sin(a) * r * 0.86 * wobble
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
}

export function centreLine(ctx, x1, x2, y, scale = 1) {
  ctx.save()
  ctx.setLineDash([18 * scale, 4 * scale, 2 * scale, 4 * scale])
  line(ctx, x1, y, x2, y)
  ctx.restore()
}

export function stipple(ctx, cx, cy, rx, ry, count, seed, size) {
  let s = seed
  const rand = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI
    const d = Math.sqrt(rand())
    const px = cx + Math.cos(a) * rx * d
    const py = cy - Math.sin(a) * ry * d
    ctx.moveTo(px + size, py)
    ctx.arc(px, py, size, 0, Math.PI * 2)
  }
  ctx.fill()
}

export function renderGrid(canvas, w, h, ratio, color, minor, major) {
  canvas.width = Math.round(w * ratio)
  canvas.height = Math.round(h * ratio)
  const ctx = canvas.getContext("2d")
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, w, h)
  ctx.strokeStyle = color
  ctx.lineWidth = 0.5
  for (const [step, alpha] of [
    [minor, 0.022],
    [major, 0.05],
  ]) {
    ctx.globalAlpha = alpha
    ctx.beginPath()
    for (let x = 0.5; x < w; x += step) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let y = 0.5; y < h; y += step) {
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

export function titleBlock(ctx, x, y, w, rows, { ink, muted, text, small, line: width }) {
  const rowH = 22
  const h = rowH * rows.length
  ctx.lineWidth = width * 1.6
  ctx.strokeStyle = ink
  ctx.strokeRect(x, y, w, h)
  ctx.lineWidth = width
  rows.forEach((cells, i) => {
    const top = y + i * rowH
    if (i > 0) line(ctx, x, top, x + w, top)
    const cellW = w / cells.length
    cells.forEach(([label, value], j) => {
      const left = x + j * cellW
      if (j > 0) line(ctx, left, top, left, top + rowH)
      ctx.textBaseline = "middle"
      ctx.textAlign = "left"
      ctx.font = small
      ctx.fillStyle = muted
      ctx.fillText(label, left + 8, top + rowH / 2 + 0.5)
      if (!value) return
      const lw = ctx.measureText(label).width
      ctx.font = text
      ctx.fillStyle = ink
      ctx.fillText(value, left + 14 + lw, top + rowH / 2 + 0.5)
    })
  })
  return h
}
