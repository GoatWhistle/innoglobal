import { control, icon, roving } from "./kit-layer.js"

const SENSORS = [
  ["Д-01", "Насосная станция, 0 м", "Норма"],
  ["Д-02", "Участок 1, 420 м", "Норма"],
  ["Д-03", "Участок 2, 1 240 м", "Утечка"],
  ["Д-04", "Участок 2, 1 380 м", "Нет сигнала"],
  ["Д-05", "Переход под рекой Сосновка, 2 050 м", "Норма"],
  ["Д-06", "Участок 3, 2 610 м", "Наблюдение"],
  ["Д-07", "Узел задвижки З-2, 3 120 м", "Норма"],
  ["Д-08", "Конечный пункт, 3 900 м", "Норма"],
]

const escape = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

function mark(text, query) {
  const i = text.toLowerCase().indexOf(query.toLowerCase())
  if (!query || i < 0) return escape(text)
  const end = i + query.length
  return `${escape(text.slice(0, i))}<mark>${escape(text.slice(i, end))}</mark>${escape(text.slice(end))}`
}

export function combobox(root) {
  const input = root.querySelector('[role="combobox"]')
  const box = input.closest(".input")
  const list = document.getElementById(input.getAttribute("aria-controls"))
  let shown = []
  let active = -1
  const ui = control(box, list, {
    matchWidth: true,
    onOpen: () => input.setAttribute("aria-expanded", "true"),
    onClose: () => input.setAttribute("aria-expanded", "false"),
  })
  const highlight = (i) => {
    active = i
    list.querySelectorAll(".option").forEach((o, k) => o.toggleAttribute("data-active", k === i))
    const o = list.querySelectorAll(".option")[i]
    if (o) {
      input.setAttribute("aria-activedescendant", o.id)
      o.scrollIntoView({ block: "nearest" })
    } else input.removeAttribute("aria-activedescendant")
  }
  const render = () => {
    const q = input.value.trim()
    shown = SENSORS.filter(([id, where]) => `${id} ${where}`.toLowerCase().includes(q.toLowerCase()))
    list.innerHTML = shown.length
      ? shown
          .map(
            ([id, where, state], i) =>
              `<div class="option" role="option" id="${list.id}-${i}" aria-selected="false">${icon("sensor")}<span class="option-label">${mark(id, q)}, ${mark(where, q)}</span><span class="option-meta">${state}</span></div>`,
          )
          .join("")
      : `<div class="layer-note" role="status">${icon("search")}Нет датчиков по запросу «${escape(q)}». Проверьте номер: Д и две цифры.</div>`
    list.querySelectorAll(".option").forEach((o, i) => {
      o.addEventListener("pointerdown", (e) => e.preventDefault())
      o.addEventListener("click", () => choose(i))
      o.addEventListener("pointermove", () => active !== i && highlight(i))
    })
    highlight(shown.length && q ? 0 : -1)
  }
  const choose = (i) => {
    const [id, where] = shown[i]
    input.value = `${id}, ${where}`
    ui.close(false)
  }
  const show = () => {
    render()
    ui.open()
  }
  input.addEventListener("focus", show)
  input.addEventListener("input", show)
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault()
      if (ui.isOpen()) ui.close(false)
      else input.value = ""
      return
    }
    if (!ui.isOpen() && (e.key === "ArrowDown" || e.key === "ArrowUp")) show()
    const next = roving(shown, active, e.key)
    if (next !== null && (e.key.startsWith("Arrow") || ui.isOpen())) {
      e.preventDefault()
      highlight(next)
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault()
      choose(active)
    } else if (e.key === "Tab") ui.close(false)
  })
  box.addEventListener("click", () => input.focus())
}

const MONTH = "Ноябрь 2026"
const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

function calendar(grid) {
  let start = 10
  let end = 12
  const today = 12
  const cells = DAYS.map((d) => `<span aria-hidden="true">${d}</span>`)
  for (let i = 26; i <= 31; i++) cells.push(`<button class="cal-day" data-out tabindex="-1" disabled>${i}</button>`)
  for (let d = 1; d <= 30; d++) {
    const label = `${d} ноября 2026`
    cells.push(
      `<button class="cal-day" data-day="${d}" aria-label="${label}"${d === today ? ' data-today aria-current="date"' : ""}${d > today ? " disabled" : ""}>${d}</button>`,
    )
  }
  for (let d = 1; d <= 6; d++) cells.push(`<button class="cal-day" data-out tabindex="-1" disabled>${d}</button>`)
  grid.innerHTML = cells.join("")
  const paint = () => {
    for (const b of grid.querySelectorAll("[data-day]")) {
      const d = Number(b.dataset.day)
      b.toggleAttribute("data-edge", d === start || d === end)
      b.toggleAttribute("data-in", d > start && d < end)
      b.setAttribute("aria-pressed", String(d >= start && d <= end))
    }
  }
  let picking = false
  grid.addEventListener("click", (e) => {
    const b = e.target.closest("[data-day]")
    if (!b) return
    const d = Number(b.dataset.day)
    if (!picking) [start, end, picking] = [d, d, true]
    else {
      ;[start, end] = d < start ? [d, start] : [start, d]
      picking = false
    }
    paint()
  })
  paint()
}

export function dateRange(root) {
  const trigger = root.querySelector(".select-trigger")
  const layer = document.getElementById(trigger.getAttribute("aria-controls"))
  const value = trigger.querySelector(".select-value")
  layer.querySelector(".cal-head span").textContent = MONTH
  calendar(layer.querySelector(".cal-grid"))
  const presets = [...layer.querySelectorAll('[role="option"]')]
  for (const p of presets) p.insertAdjacentHTML("afterbegin", icon("check", "icon option-check"))
  const ui = control(trigger, layer, {
    keepOnTab: true,
    onOpen: () => layer.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true }),
  })
  trigger.addEventListener("click", ui.toggle)
  for (const p of presets)
    p.addEventListener("click", () => {
      for (const x of presets) x.setAttribute("aria-selected", String(x === p))
      value.textContent = p.querySelector(".option-label").textContent
      ui.close(true)
    })
  layer.querySelector("[data-apply]").addEventListener("click", () => {
    value.textContent = "10–12 ноября, 14:00–14:30"
    ui.close(true)
  })
  layer.querySelector("[data-close]").addEventListener("click", () => ui.close(true))
}
