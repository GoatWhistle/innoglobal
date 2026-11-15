import { control, icon, roving } from "./kit-layer.js"

const SENSORS = [
  ["Сегмент 1", "Начало трубы, 0 м", "Норма"],
  ["Сегмент 43", "Труба 1, 420 м", "Норма"],
  ["Сегмент 481", "Труба 1, 4 800 м", "Приоритет"],
  ["Сегмент 139", "Труба 1, 1 380 м", "Нет данных ВТД"],
  ["Сегмент 206", "Переход под рекой Сосновка, 2 050 м", "Норма"],
  ["Сегмент 262", "Труба 1, 2 610 м", "Внимание"],
  ["Сегмент 313", "Отвод у км 3, 3 120 м", "Норма"],
  ["Сегмент 391", "Конец трубы, 3 900 м", "Норма"],
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
      : `<div class="layer-note" role="status">${icon("search")}Нет сегментов по запросу «${escape(q)}». Номер сегмента — расстояние от начала трубы в десятках метров.</div>`
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
