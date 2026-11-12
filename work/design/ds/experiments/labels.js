import { meters } from "../runtime/scheme.js"

export function createLabels(host, select, selected) {
  const layer = document.createElement("div")
  layer.className = "lab-labels"
  const locator = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  locator.setAttribute("class", "lab-locator")
  locator.setAttribute("aria-hidden", "true")
  const zone = document.createElementNS(locator.namespaceURI, "path")
  zone.setAttribute("class", "lab-interval")
  const target = document.createElementNS(locator.namespaceURI, "circle")
  target.setAttribute("r", "9")
  locator.append(zone, target)
  layer.append(locator)
  const sensors = Array.from({ length: 6 }, (_, i) => {
    const el = document.createElement("button")
    el.className = "lab-sensor"
    el.type = "button"
    const text = document.createElement("span")
    text.textContent = `Д-0${i + 1}`
    el.append(text)
    el.setAttribute("aria-label", `Датчик Д-0${i + 1}, ${i * 2400} м`)
    el.addEventListener("pointerenter", () => select(i))
    el.addEventListener("focus", () => select(i))
    el.addEventListener("click", () => select(i))
    layer.append(el)
    return el
  })
  const insertion = document.createElement("span")
  insertion.className = "lab-mark lab-insertion"
  const estimate = document.createElement("span")
  estimate.className = "lab-mark lab-estimate"
  insertion.hidden = true; estimate.hidden = true
  layer.append(insertion, estimate)
  host.append(layer)
  const place = (el, point, edge = 32) => {
    const x = Math.max(edge, Math.min(host.clientWidth - edge, point.x))
    const y = Math.max(12, Math.min(host.clientHeight - 32, point.y))
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
  }
  return ({ project, sim }) => {
    sensors.forEach((el, i) => {
      place(el, project(i * 2400, i % 2 ? -22 : -42))
      const state = sim.sensors?.[i]?.state
      el.dataset.tone = state === 2 ? "danger" : state === 1 ? "warning" : ""
      el.setAttribute("aria-pressed", String(i === selected()))
    })
    insertion.hidden = !sim.leak
    estimate.hidden = !sim.detection
    locator.style.display = sim.detection ? "" : "none"
    if (sim.leak) {
      insertion.textContent = `Вставлена ${meters(sim.leak.x)}`
      const point = project(sim.leak.x, 52)
      point.x -= host.clientWidth < 480 ? 55 : 130
      place(insertion, point, 100)
    }
    if (sim.detection) {
      estimate.textContent = `Найдено ${meters(sim.detection.x)} ± ${meters(Math.ceil(sim.detection.spread / 10) * 10)}`
      const label = project(sim.detection.x, 84)
      label.x += host.clientWidth < 480 ? 55 : 130
      place(estimate, label, 110)
      const center = project(sim.detection.x)
      const a = project(sim.detection.x - sim.detection.spread)
      const b = project(sim.detection.x + sim.detection.spread)
      zone.setAttribute("d", `M${a.x} ${a.y}L${b.x} ${b.y}`)
      target.setAttribute("cx", center.x); target.setAttribute("cy", center.y)
    }
  }
}
