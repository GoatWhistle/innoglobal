const ODO_X0 = 780 - (4.4 * 1100) / 11.8
const ODO_W = (8.8 * 1100) / 11.8
const ODO_LEN = 5250

const first0 = (pts) => pts[0][1]

const odoCurve = (el) => {
  const svg = el.querySelector(".odo-curve")
  const pts = deckPipes.rows(el.querySelector("[data-curve]"))
  const x = (m) => ODO_X0 + (m / ODO_LEN) * ODO_W
  const y = (s) => 120 - s * 14
  deckKit.svg("line", { x1: ODO_X0, x2: ODO_X0 + ODO_W, y1: y(0), y2: y(0), class: "odo-zero f", style: "--d:0.5s" }, svg)
  const d = pts.map(([m, s], i) => `${i ? "L" : "M"}${x(m).toFixed(1)} ${y(s).toFixed(1)}`).join("")
  deckKit.svg("path", { d, class: "odo-line" }, svg)
  deckKit.svg("line", { class: "odo-guide", x1: ODO_X0, x2: ODO_X0, y1: 32, y2: y(first0(pts)) }, svg)
  deckKit.svg("circle", { class: "odo-head", cx: ODO_X0, cy: y(first0(pts)), r: 8 }, svg)
  const [first, last] = [pts[0], pts[pts.length - 1]]
  for (const [m, s, at] of [[first[0], first[1], 1.3], [last[0], last[1], 7.6]]) {
    deckKit.svg("circle", { cx: x(m), cy: y(s), r: 7, class: "odo-dot pop", style: `--d:${at}s` }, svg)
  }
  for (const [label, at] of [["0 км", ODO_X0], ["5,25 км", ODO_X0 + ODO_W]]) {
    const t = deckKit.svg("text", { x: at, y: 240, "text-anchor": "middle", class: "odo-tick f", style: "--d:0.5s", "data-plain": "" }, svg)
    t.textContent = label
  }
  const t = deckKit.svg("text", { x: ODO_X0 + ODO_W + 24, y: y(0) + 7, class: "odo-tick f", style: "--d:0.5s" }, svg)
  t.textContent = "0 м"
}

const odoLens = (lens) => {
  const svg = lens.querySelector("svg")
  const pairs = deckPipes.rows(lens.querySelector("[data-win]"))
  const lo = pairs[0][0] - 6
  const px = 510 / 64
  const x = (m) => 80 + (m - lo) * px
  deckKit.svg("line", { x1: 72, x2: 600, y1: 38, y2: 38, class: "lens-row" }, svg)
  deckKit.svg("line", { x1: 72, x2: 600, y1: 112, y2: 112, class: "lens-row" }, svg)
  const label = (text, yy) => {
    const t = deckKit.svg("text", { x: 0, y: yy + 7, "text-anchor": "start", class: "lens-label", "data-plain": "" }, svg)
    t.textContent = text
  }
  label("2018", 38)
  label("2022", 112)
  const items = pairs.map(([a, s]) => {
    const top = deckKit.svg("line", { x1: x(a), x2: x(a), y1: 22, y2: 54, class: "lens-weld" }, svg)
    const link = deckKit.svg("line", { x1: x(a), x2: x(a + s), y1: 54, y2: 96, class: "lens-link" }, svg)
    const bottom = deckKit.svg("line", { x1: x(a + s), x2: x(a + s), y1: 96, y2: 128, class: "lens-weld is-b" }, svg)
    return { a, s, link, bottom }
  })
  lens._items = items
  lens._x = x
}

const odoSnap = (lens, k) => {
  const x = lens._x
  for (const { a, s, link, bottom } of lens._items ?? []) {
    const bx = x(a + s * (1 - k))
    link.setAttribute("x2", bx.toFixed(1))
    bottom.setAttribute("x1", bx.toFixed(1))
    bottom.setAttribute("x2", bx.toFixed(1))
  }
}

const odoSpark = (el) => {
  const svg = el.querySelector(".odo-spark")
  const rows = deckPipes.rows(el.querySelector("[data-spark]"))
  const all = rows.flat()
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const x = (i) => (i / (rows.length - 1)) * 340
  const y = (v) => 6 + ((hi - v) / (hi - lo || 1)) * 68
  const line = (k) => rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(r[k]).toFixed(1)}`).join("")
  deckKit.svg("path", { d: line(0), class: "spark-raw dr", pathLength: "1", style: "--d:1.8s;--t:0.6s" }, svg)
  deckKit.svg("path", { d: line(1), class: "spark-sm dr", pathLength: "1", style: "--d:2.1s;--t:0.6s" }, svg)
}

const odoPig = (el) => {
  const a = deckActor.actor(el)
  const meter = el.querySelector(".odo-meter")
  if (!a || !meter) return
  const pts = deckPipes.rows(el.querySelector("[data-curve]"))
  const shift = (m) => {
    if (m <= pts[0][0]) return pts[0][1]
    for (let i = 1; i < pts.length; i++) {
      if (m <= pts[i][0]) {
        const [m0, s0] = pts[i - 1]
        const [m1, s1] = pts[i]
        return s0 + ((s1 - s0) * (m - m0)) / (m1 - m0)
      }
    }
    return pts[pts.length - 1][1]
  }
  const { THREE, extras } = a
  while (extras.children.length) extras.remove(extras.children[0])
  const { root } = diagParts.pig(THREE, extras)
  root.scale.set(1.1, 0.85, 0.85)
  const accent = deckPipes.color("--brand-accent")
  const steel = deckPipes.color("--ink-500")
  const rings = []
  for (let i = 0; i < 15; i++) {
    const x = -4.2 + (8.4 * i) / 14
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.74, 0.018, 8, 96).rotateY(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: steel.clone(), transparent: true, opacity: 0.55 }),
    )
    ring.position.x = x
    extras.add(ring)
    rings.push({ ring, x, glow: 0 })
  }
  const svg = el.querySelector(".odo-curve")
  const line = svg.querySelector(".odo-line")
  const guide = svg.querySelector(".odo-guide")
  const head = svg.querySelector(".odo-head")
  const total = line.getTotalLength()
  line.style.strokeDasharray = `${total}`
  const cells = [...meter.querySelectorAll("[data-m]")]
  const cx = (u) => ODO_X0 + u * ODO_W
  const cy = (sv) => 120 - sv * 14
  const place = (u, dt) => {
    const x = -4.4 + 8.8 * u
    root.position.x = x
    const m = u * ODO_LEN
    const sv = shift(m)
    cells[0].textContent = `${deckKit.fmt(m, 0)} м`
    cells[1].textContent = `${deckKit.fmt(m + sv, 0)} м`
    cells[2].textContent = `${sv >= 0 ? "+" : ""}${deckKit.fmt(sv, 1)} м`
    meter.style.setProperty("--mx", `${Math.max(130, Math.min(1430 - meter.offsetWidth, cx(u) - meter.offsetWidth / 2)).toFixed(1)}px`)
    line.style.strokeDashoffset = `${(total * (1 - u)).toFixed(1)}`
    for (const attr of ["x1", "x2"]) guide.setAttribute(attr, cx(u).toFixed(1))
    guide.setAttribute("y2", cy(sv).toFixed(1))
    head.setAttribute("cx", cx(u).toFixed(1))
    head.setAttribute("cy", cy(sv).toFixed(1))
    for (const r of rings) {
      if (Math.abs(r.x - x) < 0.12) r.glow = 1
      r.glow = Math.max(0, r.glow - dt * 0.9)
      r.ring.material.color.copy(steel).lerp(accent, r.glow)
      r.ring.material.opacity = 0.55 + 0.45 * r.glow
      r.ring.scale.setScalar(1 + 0.08 * r.glow)
    }
  }
  cancelAnimationFrame(el._pig)
  meter.classList.remove("is-on")
  el.classList.remove("is-running")
  if (deckKit.reduced) {
    place(0.62, 1)
    line.style.strokeDashoffset = "0"
    meter.classList.add("is-on")
    el.classList.add("is-running")
    return
  }
  place(0, 0)
  const RUN = 6.2
  let last = performance.now()
  const t0 = last
  const frame = (now) => {
    el._pig = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const t = (now - t0) / 1000 - 1.4
    if (t < 0) return
    meter.classList.add("is-on")
    el.classList.add("is-running")
    const k = Math.min(1, t / RUN)
    place(k * k * (3 - 2 * k), dt)
    if (k >= 1 && rings.every((r) => r.glow === 0)) cancelAnimationFrame(el._pig)
  }
  el._pig = requestAnimationFrame(frame)
}

deckScene("research", {
  init(el) {
    odoCurve(el)
    el.querySelectorAll(".odo-lens").forEach(odoLens)
    odoSpark(el)
    for (const lens of el.querySelectorAll(".odo-lens svg")) {
      lens.classList.add("f")
      lens.style.setProperty("--d", "1.45s")
    }
  },
  enter(el) {
    odoPig(el)
    const lenses = [...el.querySelectorAll(".odo-lens")]
    el._stop?.()
    if (deckKit.reduced) {
      for (const lens of lenses) odoSnap(lens, 1)
      return
    }
    for (const lens of lenses) odoSnap(lens, 0)
    el._stop = deckKit.tween({
      dur: 900,
      delay: 2600,
      curve: "inOut",
      update: (k) => lenses.forEach((lens) => odoSnap(lens, k)),
    })
  },
  leave(el) {
    el._stop?.()
    cancelAnimationFrame(el._pig)
  },
})
