import { createClient } from "../runtime/client.js"
import { chart } from "../runtime/charts.js"
import { labels, panelMarkup, updatePanel, updateSensorTable } from "../runtime/panel.js"
import { meters, scheme } from "../runtime/scheme.js"
import { recording } from "./record.js"
import { createLabels } from "./labels.js"

const q = (selector) => document.querySelector(selector)
const host = q("[data-viewport]")
const panel = q("[data-panel]")
const params = new URLSearchParams(location.search)
const IDLE = "Нажмите на трубу, чтобы открыть утечку. Потяните, чтобы повернуть."
const ACTIVE = "Вставка и результат детектора показаны отдельными метками"
let engine = null, sim = null, selected = 3, previous = null, attached = false, hover = null
panel.innerHTML = panelMarkup()
const overlay = createLabels(host, (index) => { selected = index; draw() }, () => selected)
function failed(reason) {
  host.dataset.renderer = "failed"
  q("[data-render-state]").textContent = reason.includes("отключён") ? reason : "3D недоступен. Интерактивная схема и расчёт работают."
  q("[data-record]").disabled = true
}
const initialState = ["watch", "leak", "ack", "search"].includes(params.get("state")) ? params.get("state") : "calm"
const runtime = createClient(initialState, update, () => {
  q("[data-result]").textContent = "Расчёт остановился"
  q("[data-explanation]").textContent = "Перезагрузите страницу, чтобы начать новую сессию."
  q("[data-insert]").hidden = true
})
function attach() {
  if (attached || !sim || !window.pipeTwinPipelineRenderer) return
  attached = true
  window.dispatchEvent(new CustomEvent("pipeline:attach", { detail: {
    host, sim: runtime.sim, select, send: runtime.send, overlay, fail: failed,
    ready(next) { engine = next; host.dataset.renderer = "ready"; q("[data-render-state]").textContent = "Условный участок 12 км. Струя и лужа иллюстративны, расчёт от них не зависит." },
  } }))
}
function select(m) {
  hover = m
  if (m !== null) selected = Math.min(5, Math.max(0, Math.round(m / 2400)))
  q("[data-hint]").textContent = m !== null && !sim?.leak ? `Вставить утечку на ${meters(m)}` : sim?.leak ? ACTIVE : IDLE
  draw()
}
function draw() {
  if (!sim || document.hidden) return
  if (host.dataset.renderer !== "ready") q("[data-fallback]").innerHTML = scheme(sim, selected, hover, host.clientWidth)
  for (const [key, temporal] of [["history", true], ["profile", false]]) {
    const el = q(`[data-${key}]`)
    if (el.clientWidth && el.clientHeight) el.innerHTML = chart(sim, selected, temporal, el.clientWidth, el.clientHeight)
  }
  q("[data-selected]").textContent = `Д-0${selected + 1}`
}
function update(snapshot) {
  sim = snapshot
  attach()
  updatePanel(panel, sim, previous)
  updateSensorTable(q("[data-sensors]"), sim, selected)
  if (previous !== sim.phase) {
    q("[data-hint]").textContent = sim.leak ? ACTIVE : IDLE
    q(".lab-stage").dataset.leak = String(Boolean(sim.leak))
    q("[data-announcement]").setAttribute("role", sim.phase === "leak" ? "alert" : "status")
    q("[data-announcement]").textContent = labels[sim.phase]
    previous = sim.phase
  }
  draw()
}
q("[data-theme-toggle]").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark"
  document.documentElement.dataset.theme = next
  try { localStorage.setItem("ds-theme", next) } catch {}
  themeLabel(); engine?.setTheme(next)
})
function themeLabel() {
  const dark = document.documentElement.dataset.theme === "dark"
  q("[data-theme-toggle] span").textContent = dark ? "Светлая тема" : "Тёмная тема"
  q("[data-theme-toggle]").setAttribute("aria-label", dark ? "Светлая тема" : "Тёмная тема")
}
q("[data-insert]").addEventListener("submit", (e) => {
  e.preventDefault()
  const text = q("#coordinate").value.trim().replace(/\s/g, "").replace(",", ".")
  const x = Number(text)
  const valid = Boolean(text) && Number.isFinite(x) && x >= 60 && x <= 11940
  q("#coordinate-error").textContent = valid ? "" : "Введите координату от 60 до 11 940 м"
  q("#coordinate").setAttribute("aria-invalid", String(!valid))
  if (valid) runtime.send("insert", { x })
})
q("[data-reset]").addEventListener("click", () => runtime.send("reset"))
q("[data-accept]").addEventListener("click", () => runtime.send("accept"))
for (const [button, target] of [["details", "details-panel"], ["diagnostics", "diagnostics-panel"]]) {
  q(`[data-${button}]`).addEventListener("click", (e) => {
    const open = e.currentTarget.getAttribute("aria-expanded") !== "true"
    e.currentTarget.setAttribute("aria-expanded", String(open)); q(`#${target}`).hidden = !open; draw()
  })
}
for (const el of document.querySelectorAll("[data-state]")) el.addEventListener("click", () => runtime.send("init", { state: el.dataset.state }))
q("[data-no3d]").addEventListener("click", () => { engine?.dispose(); engine = null; failed("3D отключён. Интерактивная схема и расчёт работают."); draw() })
q("[data-sensors]").addEventListener("click", (e) => { const el = e.target.closest("[data-sensor]"); if (el) { selected = Number(el.dataset.sensor); draw() } })
function fallbackCoordinate(e) {
  const rect = q("[data-fallback] svg")?.getBoundingClientRect()
  if (!rect) return null
  const x = (e.clientX - rect.left) / rect.width * 800
  return x >= 36 && x <= 764 ? (x - 36) / 728 * 12000 : null
}
q("[data-fallback]").addEventListener("pointermove", (e) => select(fallbackCoordinate(e)))
q("[data-fallback]").addEventListener("click", (e) => {
  const x = fallbackCoordinate(e)
  if (x !== null) runtime.send("insert", { x })
})
new ResizeObserver(draw).observe(q("[data-history]"))
addEventListener("pipeline:renderer", attach)
document.addEventListener("visibilitychange", draw)
setTimeout(() => { if (!attached) failed("3D не загрузился") }, 6000)
setInterval(() => {
  if (!engine || document.hidden) return
  const s = engine.stats()
  q("[data-performance]").textContent = `${s.samples} кадров; медиана ${s.median.toFixed(1)} мс; p95 ${s.p95.toFixed(1)} мс; рендер p95 ${s.render.toFixed(1)} мс; DPR ${s.dpr}; частиц ${s.particles}; геометрий ${s.geometries}; текстур ${s.textures}; вызовов ${s.calls}. Симуляция ${s.simulationTime.toFixed(1)} с; сцена ${s.visualTime.toFixed(1)} с; ${s.reducedMotion ? "движение уменьшено" : "полное движение"}.`
}, 500)
window.pipeTwinPipeline = { stats: () => engine?.stats() }
recording(q("[data-record]"), q("[data-record-state]"), q("canvas"))
themeLabel()
