import { createClient } from "./client.js"
import { chart } from "./charts.js"
import { labels, panelMarkup, updateSensorTable, symbol, tone, updatePanel } from "./panel.js"
import { meters, scheme } from "./scheme.js"
import { badge } from "../screens-shell.js"

export function start(state) {
  const q = (s) => document.querySelector(s)
  const host = q("[data-stage]")
  const status = q("[data-status]")
  status.innerHTML = panelMarkup()
  let selected = 3
  let hover = null
  let previous = null
  let attached = false
  let snapshot = null
  let shownAt = 0
  const runtime = createClient(state, update, () => {
    q("[data-scene-state]").textContent = "Локальный расчёт остановился. Перезагрузите страницу, чтобы начать заново."
    q("[data-insert]").hidden = true
    q("[data-result]").textContent = "Расчёт недоступен"
  })
  function select(m) {
    hover = m
    if (m !== null) selected = Math.min(5, Math.max(0, Math.round(m / 2400)))
    q("[data-hint]").textContent = m === null ? snapshot?.leak ? "Метка вставки и область обнаружения показаны отдельно" : "Нажмите на трубу или задайте координату справа" : `Точка воздействия ${meters(m)}`
    draw()
  }
  function attach() {
    if (attached || !snapshot || !window.pipeTwinSceneReady) return
    attached = true
    window.dispatchEvent(new CustomEvent("pipetwin:scene", { detail: { host, sim: runtime.sim, send: runtime.send, select, choose, selected: () => selected } }))
  }
  function choose(index) {
    selected = index
    draw()
  }
  function draw() {
    if (!snapshot || document.hidden) return
    if (host.dataset.renderer !== "ready") q("[data-scheme]").innerHTML = scheme(snapshot, selected, hover, host.clientWidth)
    for (const [key, temporal] of [["profile", false], ["history", true]]) {
      const el = q(`[data-${key}]`)
      el.innerHTML = chart(snapshot, selected, temporal, el.clientWidth, el.clientHeight)
    }
    q("[data-selected]").textContent = `Д-0${selected + 1}`
  }
  function sequence(sim) {
    const steps = [["calm", "Норма"], ["deviation", "Расхождение"], ["watch", "Наблюдение"], ["leak", "Обнаружена"], ["ack", "Принята"]]
    const signature = sim.events.map((event) => event.type).join(",")
    const node = q("[data-sequence]")
    if (node.dataset.signature === signature) return
    node.dataset.signature = signature
    node.innerHTML = steps.map(([key, name]) => {
      const event = sim.events.find((entry) => entry.type === key)
      const current = sim.phase === key || key === "calm" && sim.phase === "search"
      const time = event && sim.leak ? `${Math.max(0, event.time - sim.leak.t0).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} с` : key === "calm" ? "До воздействия" : "Ожидание"
      return `<li data-done="${Boolean(event) || key === "calm"}" data-tone="${event ? tone(key) : ""}"${current ? ' aria-current="step"' : ""}><span>${name}</span><time>${time}</time></li>`
    }).join("")
  }
  function update(sim) {
    snapshot = sim
    sequence(sim)
    attach()
    updatePanel(status, sim, previous)
    if (previous !== sim.phase) {
      q("[data-line]").innerHTML = badge(tone(sim.phase), symbol(sim.phase), labels[sim.phase])
      q("[data-announcement]").setAttribute("role", sim.phase === "leak" ? "alert" : "status")
      q("[data-announcement]").setAttribute("aria-live", sim.phase === "leak" ? "assertive" : "polite")
      q("[data-announcement]").textContent = labels[sim.phase]
      document.title = `${labels[sim.phase]} | duppel`
      previous = sim.phase
    }
    q(".app-live span").textContent = sim.paused ? "Пример на паузе" : "Расчёт в браузере"
    q(".app-live time").textContent = `${sim.time.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} с`
    if (performance.now() - shownAt > 250) {
      updateSensorTable(q("[data-sensors]"), sim, selected)
      shownAt = performance.now()
    }
    q("[data-events]").innerHTML = sim.events.map((e) => `<li><time>${e.time.toFixed(2)} с</time><span>${e.type === "insert" ? "Утечка вставлена" : labels[e.type] ?? e.type}</span></li>`).join("")
    draw()
    if (hover === null) q("[data-hint]").textContent = sim.leak ? "Метка вставки и результат детектора показаны отдельно" : "Нажмите на трубу или задайте координату в поле"
  }
  addEventListener("pipetwin:renderer", attach)
  host.addEventListener("scene:failed", ({ detail }) => { q("[data-scene-state]").textContent = detail })
  host.addEventListener("pointermove", (e) => {
    if (host.dataset.renderer === "ready") return
    const rect = q("[data-scheme] svg")?.getBoundingClientRect()
    if (!rect) return
    const px = (e.clientX - rect.left) / rect.width * 800
    const py = (e.clientY - rect.top) / rect.height * 220
    select(px >= 36 && px <= 764 && py >= 70 && py <= 165 ? (px - 36) / 728 * 12000 : null)
  })
  q("[data-scheme]").addEventListener("click", (e) => {
    const target = e.target.closest("[data-sensor]")
    if (target) { selected = Number(target.dataset.sensor); draw(); return }
    const rect = q("[data-scheme] svg")?.getBoundingClientRect()
    if (!rect) return
    const px = (e.clientX - rect.left) / rect.width * 800
    const py = (e.clientY - rect.top) / rect.height * 220
    if (px >= 36 && px <= 764 && py >= 70 && py <= 165) runtime.send("insert", { x: (px - 36) / 728 * 12000 })
  })
  q("[data-insert]").addEventListener("submit", (e) => {
    e.preventDefault()
    const value = q("#coordinate").value.trim().replace(/\s/g, "").replace(",", ".")
    const x = Number(value)
    const valid = value !== "" && Number.isFinite(x) && x >= 60 && x <= 11940
    q("#coordinate-error").textContent = valid ? "" : "Введите координату от 60 до 11 940 м"
    q("#coordinate").setAttribute("aria-invalid", String(!valid))
    if (valid) runtime.send("insert", { x })
  })
  q("[data-reset]").addEventListener("click", () => { previous = null; runtime.send("reset") })
  q("[data-accept]").addEventListener("click", () => runtime.send("accept"))
  q("[data-home]").addEventListener("click", () => host.dispatchEvent(new Event("scene:home")))
  q("[data-fullscreen]").addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else host.requestFullscreen?.().catch(() => { q("[data-scene-state]").textContent = "Полный экран недоступен. Используйте текущий вид." })
  })
  q("[data-disclosure]").addEventListener("click", (e) => {
    const open = e.currentTarget.getAttribute("aria-expanded") !== "true"
    e.currentTarget.setAttribute("aria-expanded", String(open))
    q("#sensor-details").hidden = !open
  })
  for (const el of [q("[data-profile]"), q("[data-sensors]")]) {
    for (const event of ["pointerover", "click"]) el.addEventListener(event, (e) => {
      const target = e.target.closest("[data-sensor]")
      if (target) { selected = Number(target.dataset.sensor); draw() }
    })
  }
  new ResizeObserver(draw).observe(q("[data-profile]"))
  document.addEventListener("visibilitychange", draw)
  document.addEventListener("theme:change", draw)
  if (state === "nogl") {
    host.dataset.renderer = "failed"
    q("[data-scene-state]").textContent = "3D отключён для проверки. Интерактивная схема и поиск утечки работают."
  }
  setTimeout(() => {
    if (!attached) {
      host.dataset.renderer = "failed"
      q("[data-scene-state]").textContent = "3D не загрузился. Интерактивная схема и расчёт доступны."
    }
  }, 4000)
}
