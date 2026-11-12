import { Raycaster, Vector2 } from "three"
import { createEngine } from "./engine.js"

function attach({ detail: { sim, host, select, send, overlay, ready, fail, variant } }) {
  if (new URLSearchParams(location.search).get("nogl") === "1") return fail("3D отключён. Схема и расчёт работают.")
  try {
    const canvas = host.querySelector("canvas")
    const engine = createEngine(canvas, sim, overlay, fail)
    const events = new AbortController()
    const raycaster = new Raycaster(), pointer = new Vector2()
    let hovered = null
    const pick = (event) => {
      const rect = canvas.getBoundingClientRect()
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
      raycaster.setFromCamera(pointer, engine.camera)
      return engine.pick(raycaster.intersectObjects(engine.targets, false)[0])
    }
    canvas.addEventListener("pointermove", (e) => {
      hovered = pick(e)
      engine.hover(hovered)
      select(hovered)
      canvas.style.cursor = hovered === null || sim.leak ? "default" : "crosshair"
    }, { signal: events.signal })
    canvas.addEventListener("pointerleave", () => { hovered = null; engine.hover(null); select(null) }, { signal: events.signal })
    canvas.addEventListener("click", (e) => {
      const x = pick(e)
      if (x !== null) send("insert", { x })
    }, { signal: events.signal })
    engine.setVariant(variant)
    engine.setTheme(document.documentElement.dataset.theme)
    const observer = new ResizeObserver(() => engine.resize(host.clientWidth, host.clientHeight))
    observer.observe(host)
    const release = engine.dispose
    engine.dispose = () => { observer.disconnect(); events.abort(); release() }
    addEventListener("pagehide", () => engine.dispose(), { once: true })
    ready(engine)
  } catch (error) { fail(`3D недоступен. Показываем схему. ${error.message}`) }
}

window.pipeTwinLabRenderer = true
addEventListener("lab:attach", attach)
window.dispatchEvent(new Event("lab:renderer"))
