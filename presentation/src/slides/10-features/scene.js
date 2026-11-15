const G_PARAM_X = 470
const G_DEFECTS = [1080, 390, 46]
const G_WALL = [1080, 700, 40]
const G_TARGET = [1580, 565, 60]

deckScene("features", {
  init(el) {
    const svg = el.querySelector(".graph")
    const edges = deckPipes.rows(el.querySelector("[data-edges]"))
    const params = [...el.querySelectorAll(".graph-params li")]
    const rho = (i, j) => edges.find(([a, b]) => a === i && b === j)?.[2]
    const edgeLayer = deckKit.svg("g", {}, svg)
    const nodeLayer = deckKit.svg("g", {}, svg)
    const curve = (x1, y1, x2, y2) => {
      const mx = (x1 + x2) / 2
      return `M${x1} ${y1}C${mx} ${y1},${mx} ${y2},${x2} ${y2}`
    }
    const edge = (d, value, delay, extra = "") =>
      deckKit.svg(
        "path",
        {
          d,
          class: `g-edge dr ${value >= 0 ? "is-pos" : "is-neg"} ${extra}`,
          pathLength: "1",
          "stroke-width": (2 + Math.abs(value) * 18).toFixed(1),
          "stroke-opacity": (0.4 + Math.abs(value) * 0.9).toFixed(2),
          style: `--d:${delay.toFixed(2)}s;--t:0.8s`,
        },
        edgeLayer,
      )
    const label = (x, y, value, delay, key = false, anchor = "start") => {
      const t = deckKit.svg("text", { x, y, "text-anchor": anchor, class: `g-rho f${key ? " is-key" : ""}`, style: `--d:${delay.toFixed(2)}s` }, svg)
      t.textContent = deckKit.fmt(value, 2)
    }
    params.forEach((li, k) => {
      const i = Number(li.dataset.i)
      const y = Number(li.dataset.y)
      li.style.setProperty("--y", `${y}px`)
      li.classList.add("a")
      li.style.setProperty("--d", `${(0.3 + k * 0.06).toFixed(2)}s`)
      const dot = deckKit.svg("circle", { cx: G_PARAM_X, cy: y, r: 7, class: "g-dot pop", style: `--d:${(0.35 + k * 0.06).toFixed(2)}s` }, nodeLayer)
      dot.style.transformOrigin = `${G_PARAM_X}px ${y}px`
      const toDefects = rho(i, 8)
      const toWall = rho(i, 9)
      const value = toDefects ?? toWall
      if (value === undefined) return
      const hub = toDefects !== undefined ? G_DEFECTS : G_WALL
      edge(curve(G_PARAM_X + 70, y, hub[0] - hub[2], hub[1]), value, 0.8 + k * 0.07)
      deckKit.svg("line", { x1: G_PARAM_X, y1: y, x2: G_PARAM_X + 70, y2: y, class: `g-edge f ${value >= 0 ? "is-pos" : "is-neg"}`, "stroke-width": 2, "stroke-opacity": 0.5, style: `--d:${(0.7 + k * 0.07).toFixed(2)}s` }, edgeLayer)
      label(G_PARAM_X + 20, y - 12, value, 1.2 + k * 0.07)
    })
    const main = [
      [G_DEFECTS, rho(8, 10), 1.6],
      [G_WALL, rho(9, 10), 1.7],
    ]
    const flow = el.querySelector(".graph-flow")
    main.forEach(([hub, value, delay], k) => {
      const d = curve(hub[0] + hub[2], hub[1], G_TARGET[0] - G_TARGET[2], G_TARGET[1] + (k ? 18 : -18))
      edge(d, value, delay)
      label((hub[0] + G_TARGET[0]) / 2, (hub[1] + G_TARGET[1]) / 2 + (k ? 44 : -26), value, delay + 0.5, true, "middle")
      for (let n = 0; n < 3; n++) {
        const dot = document.createElement("i")
        if (value < 0) dot.classList.add("is-neg")
        dot.style.setProperty("--path", `path('${d}')`)
        dot.style.setProperty("--delay", `${(2.4 + n * 0.8 + k * 0.4).toFixed(2)}s`)
        dot.style.setProperty("--dur", "2.4s")
        flow.append(dot)
      }
    })
    const link = rho(8, 9)
    edge(`M${G_DEFECTS[0]} ${G_DEFECTS[1] + G_DEFECTS[2]}L${G_WALL[0]} ${G_WALL[1] - G_WALL[2]}`, link, 1.5)
    label(G_DEFECTS[0] + 26, (G_DEFECTS[1] + G_WALL[1]) / 2 + 8, link, 2, true)
    for (const [hub, kind, delay] of [[G_DEFECTS, "", 0.8], [G_WALL, "", 0.9], [G_TARGET, " is-target", 1.3]]) {
      const c = deckKit.svg("circle", { cx: hub[0], cy: hub[1], r: hub[2], class: `g-hub pop${kind}`, style: `--d:${delay}s` }, nodeLayer)
      c.style.transformOrigin = `${hub[0]}px ${hub[1]}px`
    }
    const ring = deckKit.svg("circle", { cx: G_TARGET[0], cy: G_TARGET[1], r: G_TARGET[2] + 14, class: "g-ring f", style: "--d:1.6s" }, nodeLayer)
    ring.style.transformOrigin = `${G_TARGET[0]}px ${G_TARGET[1]}px`
  },
})
