import { Raycaster, Vector2 } from "three"
import { createEngine } from "../pipeline/engine.js"
import { createLabels } from "../pipeline/labels.js"

function attach({ detail: { host, sim, send, select, choose, selected } }) {
  const fail = (message) => {
    host.dataset.renderer = "failed"
    host.dispatchEvent(new CustomEvent("scene:failed", { detail: message }))
  }
  if (new URLSearchParams(location.search).get("state") === "nogl") return
  try {
    const canvas = host.querySelector("[data-canvas]")
    const overlay = createLabels(host, choose, selected)
    const engine = createEngine(canvas, sim, overlay, () => fail("3D остановился. Схема и расчёт продолжают работать."))
    const events = new AbortController()
    const options = { signal: events.signal }
    const raycaster = new Raycaster(), pointer = new Vector2()
    let drag = null
    const pick = (event) => {
      const rect = canvas.getBoundingClientRect()
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
      raycaster.setFromCamera(pointer, engine.camera)
      return engine.pick(raycaster.intersectObjects(engine.targets, false)[0])
    }
    canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, moved: false } }, options)
    addEventListener("pointerup", () => { if (drag) setTimeout(() => { drag = null }, 0) }, options)
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
    }, options)
    canvas.addEventListener("pointerleave", () => { engine.hover(null); select(null) }, options)
    canvas.addEventListener("click", (e) => {
      if (drag?.moved) return
      const x = pick(e)
      if (x !== null) send("insert", { x })
    }, options)
    canvas.addEventListener("dblclick", () => engine.home(), options)
    host.addEventListener("scene:home", () => engine.home(), options)
    document.addEventListener("theme:change", () => engine.setTheme(document.documentElement.dataset.theme), options)
    engine.setTheme(document.documentElement.dataset.theme)
    const observer = new ResizeObserver(() => engine.resize(host.clientWidth, host.clientHeight))
    observer.observe(host)
    addEventListener("pagehide", () => { observer.disconnect(); events.abort(); engine.dispose() }, { once: true })
    host.dataset.renderer = "ready"
  } catch {
    fail("3D недоступен. Показываем интерактивную схему.")
  }
}

addEventListener("pipetwin:scene", attach)
window.pipeTwinSceneReady = true
window.dispatchEvent(new Event("pipetwin:renderer"))
