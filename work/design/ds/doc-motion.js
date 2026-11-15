import { make, ms, num, raw } from "./doc-read.js"

const GROUPS = [
  [
    "Интерфейс",
    [
      ["--dur-instant", "отклик"],
      ["--dur-fast-exit", "быстрый выход"],
      ["--dur-press", "нажатие"],
      ["--dur-exit", "выход"],
      ["--dur-fast", "смена цвета"],
      ["--dur-base", "появление"],
      ["--dur-panel", "панель"],
      ["--dur-slow", "крупный вход"],
    ],
  ],
  [
    "Сцена",
    [
      ["--dur-scene", "камера, линза"],
      ["--dur-draw", "прорисовка линии"],
      ["--dur-scene-long", "долгий переход"],
    ],
  ],
  [
    "Циклы",
    [
      ["--dur-spin", "оборот спиннера"],
      ["--dur-alarm", "пульс приоритета"],
      ["--dur-breathe", "дыхание скелетона"],
    ],
  ],
]
const TEMPOS = {
  ui: ["--ease-out", ["--dur-instant", "--dur-slow"], "--dur-base"],
  scene: ["--ease-viscous", ["--dur-scene", "--dur-scene-long"], "--dur-scene-long"],
}

function bezier(name) {
  const match = /cubic-bezier\(([^)]+)\)/.exec(raw(name))
  return match ? match[1].split(",").map(Number) : [0, 0, 1, 1]
}

function curves() {
  for (const path of document.querySelectorAll("[data-curve]")) {
    const [x1, y1, x2, y2] = bezier(path.dataset.curve)
    const p = (x, y) => `${x * 100} ${100 - y * 100}`
    path.setAttribute("d", `M0 100C${p(x1, y1)} ${p(x2, y2)} ${p(1, 1)}`)
  }
  for (const [key, [ease, [from, to]]] of Object.entries(TEMPOS)) {
    const meta = document.querySelector(`[data-tempo-meta="${key}"]`)
    meta.textContent = `${num(ms(from))}–${num(ms(to))} мс, `
    make("code", "", meta, ease)
  }
}

function durations() {
  const host = document.querySelector("[data-durations]")
  const longest = Math.max(...GROUPS.flatMap(([, rows]) => rows.map(([name]) => ms(name))))
  for (const [title, rows] of GROUPS) {
    const group = make("div", "duration-group", host)
    make("p", "duration-title", group, title)
    for (const [name, label] of rows) {
      const row = make("div", "duration", group)
      make("span", "duration-label", row, label)
      make("code", "duration-token", row, name)
      make("span", "duration-value", row, num(ms(name)))
      make("i", "duration-bar", row).style.setProperty("--share", ms(name) / longest)
    }
  }
}

function tempos() {
  const host = document.querySelector("[data-tempos]")
  const button = host.querySelector("[data-replay]")
  for (const [key, [ease, , duration]] of Object.entries(TEMPOS)) {
    const dot = host.querySelector(`[data-tempo="${key}"] .tempo-dot`)
    dot.style.transitionTimingFunction = `var(${ease})`
    dot.style.transitionDuration = `var(${duration})`
  }
  button.addEventListener("click", () => {
    const run = host.toggleAttribute("data-run")
    button.querySelector("use").setAttribute("href", `icons.svg#${run ? "reset" : "play"}`)
    button.lastChild.textContent = run ? "Вернуть" : "Запустить"
  })
}

curves()
durations()
tempos()
