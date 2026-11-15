const ARCH_LINKS = [
  ["bus", "m1", 0.75],
  ["bus", "m2", 0.8],
  ["bus", "m3", 0.85],
  ["bus", "m4", 0.9],
  ["m1", "c1", 1.05],
  ["m2", "c1", 1.1],
  ["m3", "c2", 1.15],
  ["m4", "c2", 1.2],
  ["c1", "o1", 1.35],
  ["c2", "o1", 1.4],
  ["c1", "o2", 1.45, "is-key"],
  ["c2", "o2", 1.5, "is-key"],
]

const ARCH_ROUTES = [
  ["f1", "m1", "c1", "o2"],
  ["f2", "m4", "c2", "o2"],
]

deckScene("architecture", {
  init(el) {
    const svg = el.querySelector(".arch")
    const box = {}
    for (const node of el.querySelectorAll("[data-box]")) {
      const [x, y, w, h] = node.dataset.xywh.split(",").map(Number)
      Object.assign(node.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` })
      node.classList.add("a")
      box[node.dataset.box] = { x, y, w, h, r: x + w, m: y + h / 2 }
    }
    for (const head of el.querySelectorAll(".arch-col-head, .arch-row")) head.classList.add("a")
    const BUS = 500
    box.bus = { r: BUS, m: 0 }
    const curve = (x1, y1, x2, y2) => {
      const mx = (x1 + x2) / 2
      return `M${x1} ${y1}C${mx} ${y1},${mx} ${y2},${x2} ${y2}`
    }
    const feats = ["f1", "f2", "f3", "f4"].map((k) => box[k])
    for (const [i, f] of feats.entries()) {
      deckKit.svg("path", { d: `M${f.r} ${f.m}H${BUS}`, class: "arch-link dr", pathLength: "1", style: `--d:${(0.55 + i * 0.05).toFixed(2)}s;--t:0.3s` }, svg)
    }
    deckKit.svg("path", { d: `M${BUS} ${box.f1.m}V${box.m4.m}`, class: "arch-link dr", pathLength: "1", style: "--d:0.65s;--t:0.4s" }, svg)
    const path = (from, to) => {
      const a = box[from]
      const b = box[to]
      return from === "bus" ? `M${BUS} ${b.m}H${b.x}` : curve(a.r, a.m, b.x, b.m)
    }
    for (const [from, to, at, kind = ""] of ARCH_LINKS) {
      deckKit.svg("path", { d: path(from, to), class: `arch-link dr ${kind}`, pathLength: "1", style: `--d:${at}s;--t:0.4s` }, svg)
    }
    const tail = (x1, y1, x2, y2) => {
      const mx = (x1 + x2) / 2
      return `C${mx} ${y1},${mx} ${y2},${x2} ${y2}`
    }
    el._routes = ARCH_ROUTES.map(([f, m, c, o]) => {
      const d = [
        `M${box[f].r} ${box[f].m}H${BUS}V${box[m].m}H${box[m].r}`,
        tail(box[m].r, box[m].m, box[c].x, box[c].m),
        `H${box[c].r}`,
        tail(box[c].r, box[c].m, box[o].x, box[o].m),
      ].join("")
      return deckKit.svg("path", { d, fill: "none", stroke: "none" }, svg)
    })
    el._ball = deckKit.svg("circle", { r: 9, class: "arch-ball" }, svg)
  },
  enter(el) {
    cancelAnimationFrame(el._raf)
    const ball = el._ball
    ball.style.opacity = "0"
    if (deckKit.reduced) return
    const lens = el._routes.map((p) => p.getTotalLength())
    const RUN = 3.2
    const GAP = 0.6
    const t0 = performance.now()
    const frame = (now) => {
      el._raf = requestAnimationFrame(frame)
      const t = (now - t0) / 1000 - 2
      if (t < 0) return
      const cycle = t % ((RUN + GAP) * lens.length)
      const i = Math.floor(cycle / (RUN + GAP))
      const local = cycle - i * (RUN + GAP)
      if (local > RUN) {
        ball.style.opacity = "0"
        return
      }
      const k = deckKit.ease.inOut(local / RUN)
      const pt = el._routes[i].getPointAtLength(k * lens[i])
      ball.setAttribute("cx", pt.x.toFixed(1))
      ball.setAttribute("cy", pt.y.toFixed(1))
      ball.style.opacity = String(Math.min(1, local / 0.2, (RUN - local) / 0.2))
    }
    el._raf = requestAnimationFrame(frame)
  },
  leave(el) {
    cancelAnimationFrame(el._raf)
  },
})
