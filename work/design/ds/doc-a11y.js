import { color, inTheme, make, num, ratio, THEMES } from "./doc-read.js"

const SURFACES = [
  ["--surface-base", "Страница"],
  ["--surface-raised", "Панель"],
  ["--surface-raised-hover", "Под курсором"],
  ["--surface-sunken", "Дорожка"],
  ["--surface-float", "Слой"],
]
const FRONTS = [
  ["Текст, норма 4,5", 4.5, null],
  ["--text-primary", 4.5, "Основной"],
  ["--text-secondary", 4.5, "Второй план"],
  ["--text-muted", 4.5, "Подписи"],
  ["--text-danger", 4.5, "Приоритет"],
  ["--text-warning", 4.5, "Подозрение"],
  ["Метки и контуры, норма 3", 3, null],
  ["--border-control", 3, "Контур поля"],
  ["--status-danger", 3, "Метка приоритета"],
  ["--status-warning", 3, "Метка подозрения"],
  ["--focus-ring", 3, "Фокус"],
]
const PAIRS = [
  ["--action-primary-text", "--action-primary", "Главная кнопка"],
  ["--action-danger-text", "--action-danger", "Опасная кнопка"],
  ["--text-danger", "--signal-danger-surface", "Текст приоритета на его фоне"],
  ["--text-warning", "--signal-warning-surface", "Текст подозрения на его фоне"],
  ["--text-on-inverse", "--surface-inverse", "Инверсия"],
]

function score(parent, value, minimum) {
  const cell = make("td", "num", parent, num(value, 1))
  if (value >= minimum) return
  cell.classList.add("fail")
  make("span", "visually-hidden", cell, ", ниже нормы")
}

function matrix(host, theme, label) {
  const figure = make("figure", "matrix", host)
  make("figcaption", "", figure, label)
  const scroll = make("div", "scroll", figure)
  scroll.tabIndex = 0
  scroll.setAttribute("role", "region")
  scroll.setAttribute("aria-label", `Контраст, ${label.toLowerCase()} тема`)
  const table = make("table", "", scroll)
  const head = make("tr", "", make("thead", "", table))
  make("th", "", head, "").scope = "col"
  for (const [, title] of SURFACES) make("th", "num", head, title).scope = "col"
  const body = make("tbody", "", table)
  inTheme(theme, () => {
    for (const [name, minimum, title] of FRONTS) {
      const row = make("tr", "", body)
      if (title === null) {
        row.className = "matrix-group"
        make("th", "", row, name).colSpan = SURFACES.length + 1
        continue
      }
      make("th", "", row, title).scope = "row"
      for (const [surface] of SURFACES) {
        const back = color(surface).rgb
        score(row, ratio(color(name, `rgb(${back})`).rgb, back), minimum)
      }
    }
    const pairs = make("dl", "pairs", figure)
    for (const [front, back, title] of PAIRS) {
      const item = make("div", "", pairs)
      make("dt", "", item, title)
      const value = ratio(color(front).rgb, color(back, color("--surface-raised").rgb).rgb)
      const dd = make("dd", value >= 4.5 ? "" : "fail", item, num(value, 1))
      if (value < 4.5) make("span", "visually-hidden", dd, ", ниже нормы")
    }
  })
}

function matrices() {
  const host = document.querySelector("[data-matrices]")
  for (const [theme, label] of THEMES) matrix(host, theme, label)
}

if (document.querySelector("[data-matrices]")) matrices()
