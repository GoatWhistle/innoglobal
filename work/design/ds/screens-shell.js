import { segmented } from "./kit-controls.js"
import { icon } from "./kit-layer.js"
import { dialogs, tooltips } from "./kit-overlay.js"
import { readTheme, themeSwitch } from "./kit-theme.js"

const NAV = [
  ["twin", "screen-twin.html", "cube", "Участок"],
  ["journal", "screen-journal.html", "journal", "Журнал"],
  ["sensors", "screen-sensors.html", "sensor", "Датчики"],
  ["model", "screen-model.html", "sliders", "Модель"],
]

const LINE = {
  calm: ["", "check", "Утечек нет"],
  watch: ["warning", "warning", "Наблюдение"],
  leak: ["danger", "alarm", "Утечка"],
  off: ["muted", "offline", "Нет связи"],
}

const SHELL = {
  offline: {
    live: ["off", "offline", "Нет связи 12 с"],
    banner: `<div class="banner" data-tone="system" role="status">${icon("offline")}<p class="banner-text"><b>Связь с сервером потеряна 12 с назад.</b> Модель и поиск утечки работают в браузере, журнал догрузится сам, когда связь вернётся.</p><div class="banner-actions"><button type="button" class="button button-secondary button-sm">${icon("refresh")}<span>Повторить</span></button></div></div>`,
  },
  paused: {
    live: ["", "pause", "Модель на паузе"],
    banner: `<div class="banner" role="status">${icon("pause")}<p class="banner-text"><b>Модель на паузе с 14:30:12.</b> Датчики пишут показания, сравнение с моделью и поиск утечки остановлены.</p><div class="banner-actions"><button type="button" class="button button-primary button-sm">${icon("play")}<span>Продолжить</span></button></div></div>`,
  },
}

const params = new URLSearchParams(location.search)

export const badge = (tone, ic, text, sm = false) =>
  `<span class="badge${sm ? " badge-sm" : ""}"${tone ? ` data-tone="${tone}"` : ""}>${icon(ic)}<span>${text}</span></span>`

const navLinks = (screen, cls) =>
  NAV.map(
    ([id, href, ic, label]) =>
      `<a href="${href}"${id === screen ? ' aria-current="page"' : ""}${cls ? "" : ` data-tip="${label}"`}>${icon(ic)}<span>${label}</span></a>`,
  ).join("")

function bar(screen, shellState) {
  const theme = readTheme()
  const live = SHELL[shellState]?.live ?? ["", "flow", "Модель считает"]
  const radio = (v, ic, label) =>
    `<button type="button" role="radio" aria-checked="${theme === v}" data-value="${v}" aria-label="${label}" data-tip="${label}">${icon(ic)}</button>`
  return `<header class="app-bar">
<a class="app-mark brand" href="screens.html" aria-label="duppel"><svg class="brand-lockup" aria-hidden="true"><use href="brand.svg#lockup" width="100%" height="100%"/></svg></a>
<nav class="app-nav" aria-label="Разделы">${navLinks(screen)}</nav>
<div class="app-tail">
<span class="app-live" data-tone="${live[0]}" aria-label="${live[2]}" data-tip="${live[2]}">${icon(live[1])}<span>${live[2]}</span><time>14:32:08</time></span>
<span data-line></span>
<div class="segmented segmented-icons" role="radiogroup" aria-label="Тема" data-theme-switch>${radio("dark", "moon", "Тёмная тема")}${radio("light", "sun", "Светлая тема")}</div>
</div>
</header>
<div class="app-banner" data-app-banner>${SHELL[shellState]?.banner ?? ""}</div>`
}

function dock(config, state) {
  const host = document.createElement("aside")
  host.className = "dock"
  host.setAttribute("aria-label", "Шаблон экрана")
  const keep = params.get("dock") === "0" ? "&dock=0" : ""
  const states = config.states
    .map(([id, label]) => `<a href="?state=${id}${keep}" data-state="${id}" aria-current="${id === state}">${label}</a>`)
    .join("")
  const parts = config.parts.map(([k, v]) => `<li><b>${k}:</b> ${v}</li>`).join("")
  host.innerHTML = `<button type="button" class="dock-toggle" aria-expanded="false" aria-controls="dock-panel">${icon("layers")}<span>Из чего собрано</span></button>
<div class="dock-panel" id="dock-panel" hidden><p class="dock-title">${config.title}</p><p class="dock-sub">Состояния</p><nav class="dock-states" aria-label="Состояния шаблона">${states}</nav><p class="dock-sub">Компоненты и раскладка</p><ul class="dock-parts">${parts}</ul><div class="dock-links"><a href="screens.html">Все шаблоны</a><a href="kit.html">Набор компонентов</a></div></div>`
  document.body.append(host)
  const toggle = host.querySelector(".dock-toggle")
  const panel = host.querySelector(".dock-panel")
  toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden
    toggle.setAttribute("aria-expanded", String(!panel.hidden))
  })
}

function apply(config, state) {
  document.documentElement.dataset.state = state
  const line = config.line?.(state) ?? "calm"
  const host = document.querySelector("[data-line]")
  if (host) host.innerHTML = badge(...LINE[line]).replace('class="badge"', 'class="badge" role="status"')
  config.render(state)
}

export function shell(config) {
  const ids = config.states.map(([id]) => id)
  const state = ids.includes(params.get("state")) ? params.get("state") : ids[0]
  const shellState = params.get("shell") ?? config.shellOf?.(state) ?? "online"
  const root = document.documentElement
  root.dataset.shell = shellState
  if (params.get("dock") === "0") root.dataset.dock = "off"
  const app = document.querySelector(".app")
  app.insertAdjacentHTML("afterbegin", bar(config.screen, shellState))
  app.insertAdjacentHTML("beforeend", `<nav class="app-tabbar" aria-label="Разделы">${navLinks(config.screen, true)}</nav>`)
  const sw = app.querySelector("[data-theme-switch]")
  segmented(sw)
  themeSwitch(sw)
  sw.addEventListener("change", () => config.onTheme?.())
  dock(config, state)
  apply(config, state)
  tooltips()
  dialogs()
  root.dataset.ready = ""
}
