import { Raycaster, Vector2 } from "three"
import { createEngine } from "./engine.js"

function attach({ detail: { sim, host, select, send, overlay, ready, fail } }) {
  if (new URLSearchParams(location.search).get("nogl") === "1") return fail("3D отключён. Схема и расчёт работают.")
  try {
    const canvas = host.querySelector("canvas")
    const engine = createEngine(canvas, sim, overlay, fail)
    const events = new AbortController()
    const raycaster = new Raycaster(), pointer = new Vector2()
    let drag = null
    const pick = (event) => {
      const rect = canvas.getBoundingClientRect()
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
      raycaster.setFromCamera(pointer, engine.camera)
      return engine.pick(raycaster.intersectObjects(engine.targets, false)[0])
    }
    canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, moved: false } }, { signal: events.signal })
    addEventListener("pointerup", () => { if (drag) setTimeout(() => { drag = null }, 0) }, { signal: events.signal })
    canvas.addEventListener("pointermove", (e) => {
      if (drag && e.buttons) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y
        if (!drag.moved && Math.hypot(dx, dy) < 6) return
        drag.moved = true
        engine.orbit(dx, dy)
        drag.x = e.clientX; drag.y = e.clientY
        canvas.style.cursor = "grabbing"
        engine.hover(null)
        return
      }
      const hovered = pick(e)
      engine.hover(hovered)
      select(hovered)
      canvas.style.cursor = hovered === null || sim.leak ? "grab" : "crosshair"
    }, { signal: events.signal })
    canvas.addEventListener("pointerleave", () => { engine.hover(null); select(null) }, { signal: events.signal })
    canvas.addEventListener("click", (e) => {
      if (drag?.moved) return
      const x = pick(e)
      if (x !== null) send("insert", { x })
    }, { signal: events.signal })
    canvas.addEventListener("dblclick", () => engine.home(), { signal: events.signal })
    engine.setTheme(document.documentElement.dataset.theme)
    const observer = new ResizeObserver(() => engine.resize(host.clientWidth, host.clientHeight))
    observer.observe(host)
    const release = engine.dispose
    engine.dispose = () => { observer.disconnect(); events.abort(); release() }
    addEventListener("pagehide", () => engine.dispose(), { once: true })
    ready(engine)
  } catch (error) { fail(`3D недоступен. Показываем схему. ${error.message}`) }
}

window.pipeTwinPipelineRenderer = true
addEventListener("pipeline:attach", attach)
window.dispatchEvent(new Event("pipeline:renderer"))
