deckScene("architecture", {
  init(el) {
    const svg = el.querySelector(".arch")
    const steps = [...el.querySelectorAll(".arch-steps li")]
    const y = 512
    const r = 62
    const xs = steps.map((li) => Number.parseFloat(li.style.getPropertyValue("--x")))
    xs.slice(0, -1).forEach((x, i) => {
      deckKit.svg("path", { d: `M${x + r} ${y}H${xs[i + 1] - r}`, class: "arch-axis dr", pathLength: "1", style: `--d:${(0.55 + i * 0.28).toFixed(2)}s;--t:0.4s` }, svg)
    })
    const ball = deckKit.svg("circle", { cx: xs[0], cy: y, r: 10, class: "arch-ball" }, svg)
    const nodes = steps.map((li, i) => {
      const at = (0.2 + i * 0.28).toFixed(2)
      deckKit.svg("circle", { cx: xs[i], cy: y, r, class: "arch-disc f", style: `--d:${at}s` }, svg)
      const ring = deckKit.svg("circle", { cx: xs[i], cy: y, r, class: "arch-node dr", pathLength: "1", transform: `rotate(-90 ${xs[i]} ${y})`, style: `--d:${at}s;--t:0.7s` }, svg)
      li.classList.add("a")
      li.style.setProperty("--d", `${(Number(at) + 0.15).toFixed(2)}s`)
      return { li, ring }
    })
    el._arch = { xs, r, ball, nodes }
  },
  enter(el) {
    const { xs, r, ball, nodes } = el._arch
    cancelAnimationFrame(el._raf)
    for (const n of nodes) {
      n.ring.classList.remove("is-live")
      n.li.classList.remove("is-live")
    }
    ball.style.opacity = "0"
    if (deckKit.reduced) {
      for (const n of nodes) {
        n.ring.classList.add("is-live")
        n.li.classList.add("is-live")
      }
      return
    }
    const MOVE = 0.95
    const HOLD = 0.55
    const START = 2.3
    const span = MOVE + HOLD
    const total = (xs.length - 1) * span + 1.6
    const t0 = performance.now()
    const frame = (now) => {
      el._raf = requestAnimationFrame(frame)
      const t = (now - t0) / 1000 - START
      if (t < 0) return
      const loop = t % total
      const seg = Math.min(xs.length - 2, Math.floor(loop / span))
      const local = loop - seg * span
      const done = loop >= (xs.length - 1) * span
      const k = done ? 1 : deckKit.ease.inOut(Math.min(1, local / MOVE))
      const from = xs[seg] + r
      const to = xs[seg + 1] - r
      ball.setAttribute("cx", (from + (to - from) * k).toFixed(1))
      ball.style.opacity = done || local > MOVE ? "0" : "1"
      const reached = done ? xs.length - 1 : seg + (local > MOVE ? 1 : 0)
      nodes.forEach((n, i) => {
        const on = i <= reached
        n.ring.classList.toggle("is-live", on)
        n.li.classList.toggle("is-live", on)
      })
    }
    el._raf = requestAnimationFrame(frame)
  },
  leave(el) {
    cancelAnimationFrame(el._raf)
  },
})
