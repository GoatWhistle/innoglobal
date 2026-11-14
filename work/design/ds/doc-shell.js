const PAGES = [
  ["index.html", "Основы", [
    ["principles", "Принципы"],
    ["pipe-style", "Стиль от трубы"],
    ["build", "Как собрать экран"],
    ["color", "Цвет"],
    ["type", "Типографика"],
  ]],
  ["doc-brand.html", "Знак", [
    ["idea", "Идея"],
    ["build", "Построение"],
    ["space", "Поле и размеры"],
    ["color", "Цвет"],
    ["misuse", "Так нельзя"],
    ["motion", "Движение знака"],
    ["seconds", "Секунды"],
    ["icons", "Иконки и favicon"],
  ]],
  ["doc-drawing.html", "Две личности", [
    ["personas", "Ночь и чертёж"],
    ["drawing", "Словарь чертежа"],
    ["signature", "Подписные детали"],
  ]],
  ["doc-base.html", "Форма и движение", [
    ["space", "Ритм и форма"],
    ["depth", "Слои"],
    ["motion", "Движение"],
    ["icons", "Иконки"],
    ["a11y", "Доступность"],
  ]],
  ["doc-layout.html", "Каркас", [
    ["layout", "Каркас и сетка"],
    ["density", "Плотность"],
    ["responsive", "Адаптивность"],
  ]],
  ["doc-data.html", "Данные", [
    ["numbers", "Числа и показания"],
    ["live", "Свежесть данных"],
  ]],
  ["doc-charts.html", "Графики", [
    ["charts", "Грамматика графиков"],
    ["chart-states", "Состояния графика"],
  ]],
  ["doc-alerts.html", "Сигналы", [
    ["alerts", "Жизнь сигнала"],
    ["feedback", "Обратная связь"],
  ]],
  ["doc-forms.html", "Формы и таблицы", [
    ["forms", "Формы и параметры"],
    ["tables", "Таблицы и списки"],
  ]],
  ["doc-words.html", "Клавиши и слова", [
    ["keys", "Навигация и клавиши"],
    ["glossary", "Словарь"],
    ["copy", "Текст"],
  ]],
]
const TOP = [
  ["index.html", "Основы"],
  ["pipe-kit.html", "Компоненты"],
  ["screen-pipe.html", "Экраны"],
  ["archive.html", "Архив"],
]

const here = location.pathname.split("/").pop() || "index.html"
const isDoc = PAGES.some(([file]) => file === here)

function header() {
  const top = document.querySelector("[data-top]")
  if (!top) return
  const links = TOP.map(([file, label]) => {
    const current = file === here || (isDoc && file === "index.html")
    return `<a href="${file}"${current ? ' aria-current="page"' : ""}>${label}</a>`
  }).join("")
  top.innerHTML = `<a class="top-mark brand" href="index.html" aria-label="duppel, дизайн-система"><svg class="brand-lockup" aria-hidden="true"><use href="brand.svg#lockup" width="100%" height="100%"/></svg></a>
<nav class="top-pages" aria-label="Страницы">${links}</nav>
<div class="switch" role="radiogroup" aria-label="Тема">
<button class="switch-option" role="radio" aria-checked="true" aria-label="Тёмная тема" data-theme-pick="dark"><svg class="icon" aria-hidden="true"><use href="icons.svg#moon"/></svg><span class="switch-label">Тёмная</span></button>
<button class="switch-option" role="radio" aria-checked="false" aria-label="Светлая тема" data-theme-pick="light"><svg class="icon" aria-hidden="true"><use href="icons.svg#sun"/></svg><span class="switch-label">Светлая</span></button>
</div>`
}

function toc() {
  const host = document.querySelector("[data-toc]")
  if (!host) return
  for (const [file, label, chapters] of PAGES) {
    const group = document.createElement("div")
    group.className = "toc-group"
    const page = document.createElement("a")
    page.className = "toc-page"
    page.href = file
    page.textContent = label
    group.append(page)
    if (file === here) {
      page.setAttribute("aria-current", "page")
      for (const [id, name] of chapters) {
        const link = document.createElement("a")
        link.className = "toc-chapter"
        link.href = `#${id}`
        link.textContent = name
        group.append(link)
      }
    }
    host.append(group)
  }
}

function spy() {
  const links = new Map(
    [...document.querySelectorAll("[data-toc] .toc-chapter")].map((link) => [
      link.hash.slice(1),
      link,
    ]),
  )
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        for (const link of links.values()) link.removeAttribute("aria-current")
        links.get(entry.target.id)?.setAttribute("aria-current", "true")
      }
    },
    { rootMargin: "-30% 0px -60% 0px" },
  )
  for (const id of links.keys()) {
    const section = document.getElementById(id)
    if (section) observer.observe(section)
  }
}

header()
toc()
spy()
