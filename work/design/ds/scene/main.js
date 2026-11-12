import { createDrawing } from "./drawing.js"
import { createOverlay } from "./overlay.js"
import { createSim, SEGMENT_M } from "./sim.js"
import { readDrawTheme, readEase, readMs, readSceneTheme } from "./theme.js"
import { createWorld } from "./world.js"

const canvas = document.querySelector("[data-scene]")
const paper = document.querySelector("[data-drawing]")
const root = canvas?.closest("[data-scene-root]")

if (canvas && paper && root) start()

function start() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)")
  const ease = readEase("--ease-viscous")
  const sim = createSim()
  const overlay = createOverlay(root)
  const world = createWorld({ canvas, sim, ease })
  const drawing = createDrawing({ canvas: paper, sim, ease })
  const hover = { m: 0, on: 0, want: 0 }
  const durations = { scene: 0.8, long: 1.25 }
  const look = { value: 0, from: 0, to: 0, at: 0 }
  const levels = sim.sensors.map(() => 0)
  let inserted = 0
  let last = performance.now()
  let clock = 0
  let cost = 0
  let rendered = 0
  let drawnAt = 0

  const light = () => document.documentElement.dataset.theme === "light"

  function applyTheme(animate) {
    durations.scene = Math.max(readMs("--dur-scene") / 1000, 0.05)
    durations.long = Math.max(readMs("--dur-scene-long") / 1000, 0.05)
    world.applyTheme(readSceneTheme("dark"))
    drawing.setTheme(readDrawTheme())
    const to = light() ? 1 : 0
    if (to === look.to && animate) return
    Object.assign(look, { from: animate ? look.value : to, to, at: clock })
    if (to === 1) drawing.replay(clock)
    paper.classList.toggle("is-active", to === 1)
  }

  function resize() {
    const w = root.clientWidth
    const h = root.clientHeight
    world.resize(w, h)
    drawing.resize(w, h)
  }

  function pick(event) {
    return look.to === 1 ? drawing.pick(event) : world.pick(event)
  }

  function insert(m) {
    inserted = sim.insert(m)
    world.insert(inserted)
    drawing.insert(inserted, clock)
    root.dataset.phase = "search"
  }

  function reset() {
    sim.clear()
    world.reset(clock)
    drawing.reset(clock)
    root.dataset.phase = "idle"
  }

  function onClick(event) {
    if (sim.leak) return
    const m = pick(event)
    if (m !== null) insert(m)
  }

  function onKey(event) {
    if (event.key === "Escape" && sim.leak) return reset()
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    if (sim.leak) return reset()
    insert(SEGMENT_M * (0.15 + Math.random() * 0.7))
  }

  function onMove(event) {
    const target = event.currentTarget
    if (world.rig.dragging) {
      world.rig.drag(event.clientX, root.clientWidth)
      hover.want = 0
      return
    }
    world.input.track(event)
    const m = sim.leak ? null : pick(event)
    hover.want = m === null ? 0 : 1
    if (m !== null) hover.m = m
    target.style.cursor = m === null ? "" : "crosshair"
  }

  function onDown(event) {
    if (event.button !== 2 || look.to === 1) return
    event.preventDefault()
    canvas.setPointerCapture(event.pointerId)
    world.rig.grab(event.clientX)
    canvas.style.cursor = "grabbing"
  }

  function onUp(event) {
    if (!world.rig.dragging || event.button !== 2) return
    canvas.releasePointerCapture(event.pointerId)
    world.rig.release(clock)
    canvas.style.cursor = ""
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 1)
    last = now
    clock += dt
    const still = reduced.matches
    const k = still ? 1 : Math.min((clock - look.at) / durations.long, 1)
    look.value = look.from + (look.to - look.from) * ease(k)
    paper.style.opacity = look.value.toFixed(3)
    root.style.setProperty("--scene-look", look.value.toFixed(3))

    sim.advance(dt)
    sim.sample()
    if (sim.leak) hover.want = 0
    hover.on += (hover.want - hover.on) * Math.min(dt * 10, 1)
    sim.sensors.forEach((s, i) => {
      levels[i] += (s.state - levels[i]) * Math.min(dt * 6, 1)
    })
    overlay.update(sim, inserted)

    if (look.value < 0.999) {
      world.update({ clock, dt, reduced: still, hover, durations })
      world.labels(overlay, hover)
    }
    if (cost < 40 || now - rendered > cost * 1.5) {
      const begin = performance.now()
      if (look.value < 0.999) world.render(clock)
      if (look.value > 0.001) drawing.render({ clock, dt: clock - drawnAt, hover, reduced: still, durations, levels })
      drawnAt = clock
      rendered = performance.now()
      cost = cost * 0.8 + (rendered - begin) * 0.2
    }
    requestAnimationFrame(tick)
  }

  addEventListener("resize", resize)
  for (const surface of [canvas, paper]) {
    surface.addEventListener("pointermove", onMove)
    surface.addEventListener("pointerleave", () => {
      hover.want = 0
      world.input.release()
    })
    surface.addEventListener("click", onClick)
    surface.addEventListener("keydown", onKey)
    surface.addEventListener("contextmenu", (event) => event.preventDefault())
  }
  canvas.addEventListener("pointerdown", onDown)
  canvas.addEventListener("pointerup", onUp)
  canvas.addEventListener("pointercancel", onUp)
  root.querySelector("[data-reset]").addEventListener("click", reset)
  document.addEventListener("theme:change", () => applyTheme(true))
  applyTheme(false)
  resize()
  requestAnimationFrame(tick)
}
