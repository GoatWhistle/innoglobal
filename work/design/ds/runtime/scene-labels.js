import { Vector3 } from "three"
import { toWorld } from "../scene/layout.js"
import { meters } from "./scheme.js"

export function sceneLabels(host, sim, select) {
  const layer = document.createElement("div")
  layer.className = "scene-annotations"
  host.append(layer)
  const sensors = Array.from({ length: 6 }, (_, i) => {
    const el = document.createElement("button")
    el.className = "scene-sensor"
    el.type = "button"
    el.textContent = `Д-0${i + 1}`
    el.setAttribute("aria-label", `Выбрать датчик Д-0${i + 1}`)
    el.addEventListener("pointerenter", () => select(i * 2400))
    el.addEventListener("focus", () => select(i * 2400))
    el.addEventListener("click", () => select(i * 2400))
    layer.append(el)
    return el
  })
  const inserted = document.createElement("span")
  inserted.className = "scene-point"
  const detected = document.createElement("span")
  detected.className = "scene-point scene-detected"
  layer.append(inserted, detected)
  const point = new Vector3()
  function place(el, m, y, camera, radius, offset) {
    point.set(toWorld(m), y, radius).project(camera)
    const edge = el.classList.contains("scene-sensor") ? 24 : 64
    const x = Math.max(edge, Math.min(host.clientWidth - edge, (point.x * 0.5 + 0.5) * host.clientWidth))
    const top = (-point.y * 0.5 + 0.5) * host.clientHeight + offset
    el.style.transform = `translate(${x}px, ${top}px) translateX(-50%)`
  }
  return (world) => {
    const radius = world.frame.radius
    sensors.forEach((el, i) => {
      place(el, i * 2400, radius * 2, world.camera, radius, -44)
      el.dataset.tone = sim.sensors[i]?.state === 2 ? "danger" : sim.sensors[i]?.state === 1 ? "warning" : ""
    })
    inserted.hidden = !sim.leak
    detected.hidden = !sim.detection
    if (sim.leak) {
      inserted.textContent = `Вставлена ${meters(sim.leak.x)}`
      place(inserted, sim.leak.x, radius, world.camera, radius, 44)
    }
    if (sim.detection) {
      detected.textContent = `Найдено ${meters(sim.detection.x)} ± ${meters(Math.ceil(sim.detection.spread / 10) * 10)}`
      place(detected, sim.detection.x, radius, world.camera, radius, 76)
    }
  }
}
