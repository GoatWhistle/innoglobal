import { sceneLabels } from "./scene-labels.js"
import { createWorld } from "../scene/world.js"
import { readEase, readSceneTheme } from "../scene/theme.js"

function attach({ detail: { host, sim, send, select } }) {
  if (new URLSearchParams(location.search).get("state") === "nogl") return
  const canvas = host.querySelector("[data-canvas]")
  let world
  try {
    world = createWorld({ canvas, sim, ease: readEase("--ease-viscous") })
    const fit = () => world.resize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight))
    new ResizeObserver(fit).observe(host)
    fit()
    const theme = () => world.applyTheme(readSceneTheme("dark"))
    theme()
    document.addEventListener("theme:change", theme)
    const annotate = sceneLabels(host, sim, select)
    const hover = { m: 0, on: 0 }
    let last = performance.now()
    let clock = 8
    let leak = null
    let stopped = false
    const reduced = matchMedia("(prefers-reduced-motion: reduce)")
    const lost = (message) => {
      stopped = true
      host.dataset.renderer = "failed"
      host.dispatchEvent(new CustomEvent("scene:failed", { detail: message }))
    }
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); lost("Контекст 3D потерян. Схема и расчёт продолжают работать.") })
    function tick(now) {
      if (stopped) return
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!document.hidden && sim.model.length) {
        try {
          if (sim.leak !== null && leak !== sim.leak.t0) { world.insert(sim.leak.x); leak = sim.leak.t0 }
          if (!sim.leak && leak !== null) { world.reset(clock); leak = null }
          if (!reduced.matches) clock += dt
          world.setCutaway(host.dataset.cutaway !== "false")
          world.update({ clock, dt, reduced: reduced.matches, hover, durations: { scene: 0.8, long: 1.25 } })
          if (document.documentElement.dataset.theme !== "light") world.render(clock)
          annotate(world)
          host.dataset.renderer = "ready"
        } catch (error) { lost("3D не запустился. Показываем интерактивную схему.") }
      }
      requestAnimationFrame(tick)
    }
    canvas.addEventListener("pointermove", (e) => {
      const m = world.pick(e)
      hover.on = m === null ? 0 : 1
      if (m !== null) {
        hover.m = m
        select(m)
      }
      canvas.style.cursor = m === null || sim.leak ? "default" : "crosshair"
    })
    canvas.addEventListener("pointerleave", () => { hover.on = 0; select(null) })
    canvas.addEventListener("click", (e) => { const x = world.pick(e); if (x !== null) send("insert", { x }) })
    requestAnimationFrame(tick)
  } catch {
    host.dataset.renderer = "failed"
    host.dispatchEvent(new CustomEvent("scene:failed", { detail: "3D недоступен. Показываем интерактивную схему." }))
  }
}

addEventListener("pipetwin:scene", attach)
window.pipeTwinSceneReady = true
window.dispatchEvent(new Event("pipetwin:renderer"))
