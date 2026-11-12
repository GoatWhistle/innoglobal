import { Vector3 } from "three"

const meters = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 })
const seconds = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const tmp = new Vector3()
const anchor = new Vector3()

function point(x, y, z) {
  return anchor.set(x, y, z)
}

export function formatMeters(m) {
  return `${meters.format(Math.round(m / 10) * 10)} м`
}

export function createOverlay(root) {
  const labels = Object.fromEntries(
    [...root.querySelectorAll("[data-label]")].map((el) => [el.dataset.label, el]),
  )
  const status = root.querySelector("[data-status]")
  const caption = root.querySelector("[data-caption]")
  const figure = root.querySelector("[data-figure]")
  const detail = root.querySelector("[data-detail]")
  const reset = root.querySelector("[data-reset]")
  const idleFigure = figure.innerHTML
  const idleCaption = caption.textContent
  let phase = "idle"

  function place(el, point, camera, width, height, visible = true) {
    tmp.copy(point).project(camera)
    const x = (tmp.x * 0.5 + 0.5) * width
    const y = (-tmp.y * 0.5 + 0.5) * height
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
    el.classList.toggle("is-on", visible)
  }

  function setPhase(next) {
    if (phase === next) return
    phase = next
    status.dataset.status = next
    reset.hidden = next === "idle"
    if (next === "idle") {
      caption.textContent = idleCaption
      figure.innerHTML = idleFigure
      detail.textContent = ""
    }
    if (next === "search") caption.textContent = "Поиск утечки"
    if (next === "found") caption.textContent = "Утечка найдена за"
  }

  return {
    place,
    labels,
    layout({ camera, width, height, radius, curtain, sim, hover, toWorld, toMeters, half }) {
      const base = radius * 2
      const end = curtain.heightAt(sim.model[sim.model.length - 1]) + base
      const endMeasured = curtain.heightAt(sim.measured[sim.measured.length - 1]) + base
      const below = -radius * 0.2
      const front = radius * 1.4
      place(labels.start, point(-half, below, front), camera, width, height)
      place(labels.end, point(half, below, front), camera, width, height)
      place(labels.legend, point(0, below - radius * 1.2, front), camera, width, height)
      place(labels.model, point(half, end, 0), camera, width, height)
      place(labels.measured, point(half, Math.min(endMeasured, end - 0.001), 0), camera, width, height)
      place(labels.hover, point(hover.x, base + curtain.heightAt(5.25), 0), camera, width, height, hover.on > 0.5)
      labels.hover.textContent = formatMeters(toMeters(hover.x))
      const found = sim.detection
      if (!found) {
        labels.estimate.classList.remove("is-on")
        return
      }
      labels.estimate.textContent = formatMeters(found.x)
      place(labels.estimate, point(toWorld(found.x), curtain.base() + curtain.uniforms.uTotal.value, 0), camera, width, height)
    },
    update(sim, inserted) {
      if (!sim.leak) {
        setPhase("idle")
        return
      }
      const found = sim.detection
      setPhase(found ? "found" : "search")
      const t = found ? found.seconds : sim.age
      figure.textContent = `${seconds.format(t)} с`
      if (found) {
        detail.textContent = `на ${formatMeters(found.x)} от начала, ошибка ${formatMeters(Math.max(found.error, 10))}`
      } else {
        detail.textContent = `вставлена на ${formatMeters(inserted)}`
      }
    },
  }
}
