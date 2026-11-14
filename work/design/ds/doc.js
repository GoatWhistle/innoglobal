import { color, hex, inTheme, make, ms, num, px, raw, semanticNames, THEMES } from "./doc-read.js"

const STEPS = [0, 25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950, 1000]
const CRUDE = [
  ["pitch", "Смола"],
  ["umber", "Умбра"],
  ["olive", "Олива"],
  ["sage", "Шалфей"],
  ["amber", "Янтарь"],
  ["oxblood", "Оксблад"],
]
const ROLES = [
  ["Поверхности", null],
  ["--surface-base", "Страница"],
  ["--surface-raised", "Панель"],
  ["--surface-raised-hover", "Панель под курсором"],
  ["--surface-sunken", "Дорожка"],
  ["--surface-selected", "Выбранное в дорожке"],
  ["--surface-float", "Всплывающий слой"],
  ["--surface-skeleton", "Скелетон"],
  ["--surface-inverse", "Инверсия"],
  ["--surface-scrim", "Затемнение"],
  ["Текст", null],
  ["--text-primary", "Основной"],
  ["--text-secondary", "Второй план"],
  ["--text-muted", "Подписи"],
  ["--text-disabled", "Недоступно"],
  ["Линии", null],
  ["--border-subtle", "Разделитель"],
  ["--border-strong", "Контур"],
  ["--border-control", "Контур поля"],
  ["--border-ink", "Чернильная линия"],
  ["--focus-ring", "Фокус"],
  ["Действие", null],
  ["--action-primary", "Главное"],
  ["--action-primary-hover", "Главное под курсором"],
  ["--action-ghost-hover", "Прозрачное под курсором"],
  ["--action-danger", "Опасное"],
  ["Событие", null],
  ["--status-warning", "Подозрение, метка"],
  ["--text-warning", "Подозрение, текст"],
  ["--signal-warning-surface", "Подозрение, фон"],
  ["--status-danger", "Ошибка, метка"],
  ["--text-danger", "Ошибка, текст"],
  ["--signal-danger-surface", "Ошибка, фон"],
]

function fillLive() {
  for (const node of document.querySelectorAll("[data-ms]")) node.textContent = num(ms(node.dataset.ms))
  for (const node of document.querySelectorAll("[data-px]")) node.textContent = num(px(node.dataset.px))
  for (const node of document.querySelectorAll("[data-raw]"))
    node.textContent = raw(node.dataset.raw).replace(".", ",")
  for (const node of document.querySelectorAll("[data-num]"))
    node.textContent = num(Number(node.dataset.num), Number(node.dataset.digits ?? 0))
  for (const node of document.querySelectorAll("[data-pct]"))
    node.textContent = new Intl.NumberFormat("ru-RU", { style: "percent" }).format(
      Number(node.dataset.pct),
    )
}

function ramp() {
  const host = document.querySelector("[data-ramp]")
  for (const step of STEPS) {
    const chip = make("div", "ramp-chip", host)
    chip.style.setProperty("--c", `var(--ink-${step})`)
    chip.dataset.tone = step <= 400 ? "light" : "dark"
    make("b", "", chip, String(step))
    make("span", "", chip, hex(color(`--ink-${step}`).rgb))
  }
}

function crude() {
  const host = document.querySelector("[data-crude]")
  for (const [name, label] of CRUDE) {
    const chip = make("div", "crude-chip", host)
    chip.style.setProperty("--c", `var(--crude-${name})`)
    chip.dataset.tone = name === "sage" || name === "amber" ? "light" : "dark"
    make("b", "", chip, label)
    make("span", "", chip, hex(color(`--crude-${name}`).rgb))
  }
}

function pair() {
  const host = document.querySelector("[data-tvpair]")
  const light = host.querySelector("[data-view]")
  const names = semanticNames()
  for (const [theme, label] of THEMES) {
    const view = theme === "light" ? light : host.appendChild(light.cloneNode(true))
    view.dataset.view = theme
    const values = inTheme(theme, () => names.map((name) => [name, raw(name)]))
    for (const [name, value] of values) view.style.setProperty(name, value)
    view.style.colorScheme = theme
    view.querySelector("[data-view-name]").textContent = label
    view.querySelector("[data-view-base]").textContent = inTheme(theme, () =>
      hex(color("--surface-base").rgb),
    )
  }
}

function cell(row, theme, name) {
  const td = make("td", "role-value", row)
  const value = inTheme(theme, () => {
    const base = hex(color("--surface-base").rgb)
    const own = color(name, base)
    return { shown: hex(own.rgb), alpha: own.alpha, source: hex(own.source) }
  })
  make("i", "role-swatch", td).style.background = value.shown
  const text = value.alpha < 1 ? `${value.source}, ${num(value.alpha * 100)} %` : value.shown
  make("span", "", td, text)
}

function roles() {
  const host = document.querySelector("[data-roles]")
  for (const [name, label] of ROLES) {
    const row = make("tr", "", host)
    if (label === null) {
      row.className = "role-group"
      const th = make("th", "", row, name)
      th.colSpan = 4
      th.scope = "colgroup"
      continue
    }
    make("th", "", row, label).scope = "row"
    make("td", "role-token", row, name)
    for (const [theme] of THEMES) cell(row, theme, name)
  }
}

fillLive()
if (document.querySelector("[data-ramp]")) {
  ramp()
  pair()
  roles()
  crude()
}
