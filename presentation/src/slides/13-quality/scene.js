deckScene("quality", {
  init(el) {
    const lo = 3.5
    const hi = 8.5
    const left = 60
    const top = 30
    const size = 440
    const sx = (v) => left + ((v - lo) / (hi - lo)) * size
    const sy = (v) => top + ((hi - v) / (hi - lo)) * size
    el.querySelectorAll(".q-panel").forEach((panel, index) => {
      const svg = panel.querySelector(".q-scatter")
      const points = deckPipes.rows(panel.querySelector("[data-points]"))
      const mae = Number(panel.querySelector("[data-mae]").dataset.value)
      const lag = index * 0.15
      const at = (s) => `--d:${(s + lag).toFixed(2)}s`
      const clip = `q-clip-${index}`
      const defs = deckKit.svg("defs", {}, svg)
      const clipPath = deckKit.svg("clipPath", { id: clip }, defs)
      deckKit.svg("rect", { x: left, y: top, width: size, height: size }, clipPath)
      const grid = deckKit.svg("g", { class: "q-grid f", style: at(0.2) }, svg)
      for (let v = 4; v <= 8; v += 1) {
        deckKit.svg("line", { x1: sx(v), x2: sx(v), y1: top, y2: top + size }, grid)
        deckKit.svg("line", { x1: left, x2: left + size, y1: sy(v), y2: sy(v) }, grid)
        const tx = deckKit.svg("text", { x: sx(v), y: top + size + 34, "text-anchor": "middle", class: "q-tick", "data-plain": "" }, grid)
        tx.textContent = String(v)
        const ty = deckKit.svg("text", { x: left - 16, y: sy(v) + 7, "text-anchor": "end", class: "q-tick", "data-plain": "" }, grid)
        ty.textContent = String(v)
      }
      deckKit.svg("path", { d: `M${left} ${top + size}H${left + size}M${left} ${top}V${top + size}`, class: "q-axis-line" }, grid)
      const band = [
        [lo, lo + mae],
        [hi - mae, hi],
        [hi, hi],
        [hi, hi - mae],
        [lo + mae, lo],
        [lo, lo],
      ]
      deckKit.svg(
        "path",
        { d: `${band.map(([x, y], i) => `${i ? "L" : "M"}${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`).join("")}Z`, class: "q-band f", style: `${at(0.9)};--t:0.6s`, "clip-path": `url(#${clip})` },
        svg,
      )
      deckKit.svg("line", { x1: sx(lo), y1: sy(lo), x2: sx(hi), y2: sy(hi), class: "q-diag", pathLength: "1", style: `${at(0.3)};--t:0.8s` }, svg)
      const xs = points.map(([pred]) => pred)
      const xMin = Math.min(...xs)
      const xMax = Math.max(...xs)
      const rng = deckKit.rng(points.length)
      const dense = points.length > 100
      const dots = deckKit.svg("g", { "clip-path": `url(#${clip})` }, svg)
      for (const [pred, fact] of points) {
        const flat = fact >= 7.995
        const sweep = (pred - xMin) / (xMax - xMin)
        const delay = 0.55 + lag + sweep * 0.6 + rng() * 0.15
        deckKit.svg(
          "circle",
          {
            cx: sx(pred).toFixed(1),
            cy: sy(fact).toFixed(1),
            r: dense ? 5 : 7,
            class: `q-dot${flat ? " is-flat" : ""}${dense ? " is-dense" : ""}`,
            style: `--d:${delay.toFixed(2)}s;--dy:${(sy(pred) - sy(fact)).toFixed(1)}px`,
          },
          dots,
        )
      }
      panel.style.setProperty("--flat-y", `${sy(7.62)}px`)
    })
    const ladders = Array.from(el.querySelectorAll("[data-ladder]"), (node) => String(node.dataset.values).split(",").map(Number))
    const slope = el.querySelector(".q-slope")
    const names = ["номинал", "прошлая ВТД", "бустинги", "duppel"]
    const X0 = 70
    const X1 = 440
    const Y0 = 450
    const Y1 = 40
    const peak = 1.4
    const x = (i) => X0 + ((X1 - X0) * i) / (names.length - 1)
    const y = (v) => Y0 - ((Y0 - Y1) * v) / peak
    for (const v of [0, 0.5, 1]) {
      deckKit.svg("line", { x1: X0 - 30, x2: X1 + 30, y1: y(v), y2: y(v), class: "s-grid f", style: "--d:0.5s" }, slope)
      const t = deckKit.svg("text", { x: X0 - 40, y: y(v) + 7, "text-anchor": "end", class: "s-tick f", style: "--d:0.5s", "data-plain": "" }, slope)
      t.textContent = deckKit.fmt(v, 1)
    }
    names.forEach((name, i) => {
      const t = deckKit.svg("text", { x: x(i), y: Y0 + 44, "text-anchor": "middle", class: `s-name f${i === names.length - 1 ? " is-final" : ""}`, style: `--d:${(0.6 + i * 0.1).toFixed(2)}s` }, slope)
      t.textContent = name
    })
    ladders.forEach((values, k) => {
      const kind = k ? " is-two" : ""
      const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("")
      deckKit.svg("path", { d, class: `s-line dr${kind}`, pathLength: "1", style: `--d:${(0.9 + k * 0.2).toFixed(2)}s;--t:1s` }, slope)
      values.forEach((v, i) => {
        const last = i === values.length - 1
        const at = (1 + k * 0.2 + i * 0.25).toFixed(2)
        const dot = deckKit.svg("circle", { cx: x(i), cy: y(v), r: last ? 9 : 6, class: `s-dot pop${kind}${last ? " is-final" : ""}`, style: `--d:${at}s` }, slope)
        dot.style.transformOrigin = `${x(i)}px ${y(v)}px`
        if (i === 0 || last) {
          const label = deckKit.svg("text", { x: x(i) + (last ? 18 : 0), y: y(v) + (last ? 8 : -16), "text-anchor": last ? "start" : "middle", class: `s-value f${last ? " is-final" : ""}`, style: `--d:${at}s` }, slope)
          label.textContent = deckKit.fmt(v, 2)
        }
      })
      const series = deckKit.svg("text", { x: x(1) + 6, y: y(values[1]) + (k ? -18 : 30), "text-anchor": "middle", class: `s-series f${kind}`, style: `--d:${(1.4 + k * 0.2).toFixed(2)}s` }, slope)
      series.textContent = k ? "кейс 2" : "кейс 1"
    })
  },
})
