const SCALE_BURSTS = 96
const SCALE_PULSES = 14
const SCALE_START = 3.4
const SCALE_SPAN = 1.4

const scaleKpis = (el) => {
  for (const num of el.querySelectorAll(".fig")) {
    if (num.dataset.kpi) continue
    num.dataset.kpi = "1"
    num.classList.remove("count")
    const value = document.createElement("span")
    value.className = "fig-v"
    value.textContent = deckKit.fmt(Number(num.dataset.value), Number(num.dataset.digits || 0))
    const unit = document.createElement("span")
    unit.className = "fig-u"
    unit.textContent = (num.dataset.unit || "").trim()
    num.replaceChildren(value, unit)
  }
}

const scaleRoll = (el) => {
  for (const num of el.querySelectorAll(".fig[data-roll]")) {
    const target = Number(num.dataset.value)
    const digits = Number(num.dataset.digits || 0)
    const value = num.querySelector(".fig-v")
    num._stop?.()
    num._stop = deckKit.tween({
      to: target,
      dur: 1200,
      delay: deckKit.seconds(getComputedStyle(num).getPropertyValue("--d")) * 1000,
      update: (v) => {
        value.textContent = deckKit.fmt(v, digits)
      },
    })
  }
}

const scaleCanvas = (el) => {
  if (el._map) return el._map
  const svg = el.querySelector(".map")
  const merge = (selector) => {
    const path = new Path2D()
    for (const node of svg.querySelectorAll(selector)) path.addPath(new Path2D(node.getAttribute("d")))
    return path
  }
  const look = (selector, prop) => {
    const node = svg.querySelector(selector)
    return node ? getComputedStyle(node)[prop] : "gray"
  }
  const canvas = document.createElement("canvas")
  const ratio = Math.min(devicePixelRatio || 1, 1.5)
  canvas.className = "map-canvas"
  canvas.width = 1360 * ratio
  canvas.height = 700 * ratio
  canvas.setAttribute("aria-hidden", "true")
  svg.before(canvas)
  el._map = {
    ctx: canvas.getContext("2d"),
    ratio,
    land: merge(".map-region:not(.is-oil)"),
    oil: merge(".map-region.is-oil"),
    water: merge(".map-field .fw"),
    rivers: merge(".map-field .fr"),
    major: merge(".map-field .fm"),
    minor: merge(".map-field .fn"),
    colors: {
      land: look(".map-region:not(.is-oil)", "fill"),
      oil: look(".map-region.is-oil", "fill"),
      border: look(".map-region", "stroke"),
      water: look(".map-field .fw", "fill"),
      rivers: look(".map-field .fr", "stroke"),
      major: look(".map-field .fm", "stroke"),
      minor: look(".map-field .fn", "stroke"),
    },
  }
  el.classList.add("is-canvas")
  return el._map
}

const scaleZoom = (el) => {
  const svg = el.querySelector(".map")
  const pin = el.querySelector(".zoom-pin")
  const px = Number(svg.dataset.cx)
  const py = Number(svg.dataset.cy)
  const W = 1360
  const H = 700
  const w0 = 9
  const clamp = (v) => Math.max(0, Math.min(1, v))
  el._zoom?.()
  if (deckKit.reduced) return
  const map = scaleCanvas(el)
  const { ctx, colors } = map
  const actor = deckActor.actor(el)
  let ratio = 1
  const set = (e) => {
    const w = w0 * (W / w0) ** e
    const h = (w * H) / W
    ratio = w0 / w
    const k = (W / w) * map.ratio
    const unit = w / W
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, W * map.ratio, H * map.ratio)
    ctx.setTransform(k, 0, 0, k, -(px - (px * w) / W) * k, -(py - (py * h) / H) * k)
    const land = clamp((w - 45) / 200)
    if (land > 0) {
      ctx.globalAlpha = land
      ctx.fillStyle = colors.land
      ctx.fill(map.land)
      ctx.fillStyle = colors.oil
      ctx.fill(map.oil)
      ctx.strokeStyle = colors.border
      ctx.lineWidth = 1.2 * unit
      ctx.stroke(map.land)
      ctx.stroke(map.oil)
    }
    const field = clamp((w - 30) / 50) * clamp(1 - (w - 160) / 300)
    if (field > 0) {
      ctx.globalAlpha = field
      ctx.fillStyle = colors.water
      ctx.fill(map.water)
      ctx.lineJoin = "round"
      ctx.strokeStyle = colors.rivers
      ctx.lineWidth = 2.5 * unit
      ctx.stroke(map.rivers)
      ctx.strokeStyle = colors.minor
      ctx.lineWidth = 1.2 * unit
      ctx.stroke(map.minor)
      ctx.strokeStyle = colors.major
      ctx.lineWidth = 2.5 * unit
      ctx.stroke(map.major)
    }
    ctx.globalAlpha = 1
    const len = 1400 * ratio
    if (actor) actor.host.style.opacity = String(clamp((len - 14) / 60))
    if (pin) pin.style.opacity = String(clamp((70 - len) / 50) * clamp((1 - e) / 0.12))
  }
  deckActor.drive(el, () => ({ cx: 60 + px + (600 - 60 - px) * ratio, cy: 220 + py + (610 - 220 - py) * ratio, len: Math.max(1, 1400 * ratio) }))
  set(0)
  el._zoom = deckKit.tween({ dur: 3000, delay: 250, curve: "inOut", update: set })
}

deckScene("scale", {
  enter(el) {
    scaleRoll(el)
    failGround(el)
    scaleZoom(el)
  },
  leave(el) {
    el._zoom?.()
  },
  init(el) {
    scaleKpis(el)
    const layer = el.querySelector(".map-bursts")
    if (!layer || layer.childElementCount) return
    const regions = [...el.querySelectorAll(".map-region.is-oil")]
    const boxes = regions.map((path) => ({ path, box: path.getBBox() }))
    const total = boxes.reduce((sum, { box }) => sum + box.width * box.height, 0)
    const random = deckKit.rng(11914)
    const points = []
    let guard = 0
    while (points.length < SCALE_BURSTS && guard < 40000) {
      guard += 1
      let pick = random() * total
      const { path, box } = boxes.find(({ box: b }) => (pick -= b.width * b.height) <= 0) ?? boxes[0]
      const x = box.x + random() * box.width
      const y = box.y + random() * box.height
      if (!path.isPointInFill(new DOMPoint(x, y))) continue
      if (points.some((p) => Math.hypot(p.x - x, p.y - y) < 9)) continue
      points.push({ x, y })
    }
    for (let i = points.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[points[i], points[j]] = [points[j], points[i]]
    }
    const pulses = new Set(points.slice(0, SCALE_PULSES))
    points.forEach((point, i) => {
      const share = (i + 1) / points.length
      const at = SCALE_START + SCALE_SPAN * (1 - (1 - share) ** 0.25)
      const group = deckKit.svg("g", { class: "burst" }, layer)
      const spot = { cx: point.x.toFixed(1), cy: point.y.toFixed(1) }
      group.style.setProperty("--d", `${at.toFixed(3)}s`)
      if (pulses.has(point)) {
        const ring = deckKit.svg("circle", { class: "burst-ring only-motion", r: 3.5, ...spot }, group)
        ring.style.setProperty("--loop", `${(2.6 + random() * 5).toFixed(2)}s`)
        ring.style.setProperty("--every", `${(4 + random() * 3).toFixed(2)}s`)
      }
      deckKit.svg("circle", { class: "burst-dot", r: 2.6, ...spot }, group)
    })
  },
})
