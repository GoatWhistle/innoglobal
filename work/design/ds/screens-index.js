import { segmented } from "./kit-controls.js"
import { icon } from "./kit-layer.js"
import { themeSwitch } from "./kit-theme.js"

const SCREENS = [
  ["screen-twin.html", "cube", "Участок", "Сцена, панель состояния, датчики, профиль давления", [["calm", "Норма"], ["watch", "Наблюдение"], ["leak", "Утечка"], ["ack", "Принята"], ["nogl", "Нет 3D"]]],
  ["screen-incident.html", "alarm", "Утечка № 42", "Как нашли, где, что делать оператору", [["new", "Новая"], ["ack", "Принята"], ["shut", "Перекрытие"], ["closed", "Перекрыт"], ["false", "Ложная"]]],
  ["screen-journal.html", "journal", "Журнал", "Фильтры, таблица событий, страницы", [["default", "События"], ["loading", "Загрузка"], ["empty", "Пусто"], ["error", "Ошибка"]]],
  ["screen-sensors.html", "sensor", "Датчики", "Список с расхождением, карточка датчика, график и паспорт", [["normal", "Норма"], ["alarm", "Тревога"], ["silent", "Молчит"]]],
  ["screen-model.html", "sliders", "Модель", "Параметры расчёта и превью, которое считается сразу", [["clean", "Без правок"], ["edited", "Правка"], ["warning", "Предупреждение"], ["error", "Ошибка"], ["running", "Применяется"]]],
]

const frame = document.querySelector("[data-frame]")
const open = document.querySelector("[data-open]")
const host = document.querySelector("[data-screens]")

host.innerHTML = SCREENS.map(
  ([href, ic, name, note, states]) => `<section class="ix-item"><a class="ix-name" href="${href}" data-go="${href}">${icon(ic)}<span>${name}</span></a><p class="sd-caption">${note}</p><div class="ix-states">${states.map(([id, label]) => `<a href="${href}?state=${id}" data-go="${href}?state=${id}">${label}</a>`).join("")}</div></section>`,
).join("")

for (const a of host.querySelectorAll("[data-go]"))
  a.addEventListener("click", (e) => {
    e.preventDefault()
    const url = a.dataset.go
    frame.src = `${url}${url.includes("?") ? "&" : "?"}dock=0`
    open.href = url
    for (const x of host.querySelectorAll("[aria-current]")) x.removeAttribute("aria-current")
    a.setAttribute("aria-current", "true")
    if (matchMedia("(max-width: 64rem)").matches) document.querySelector(".ix-view").scrollIntoView({ block: "start" })
  })

const width = document.querySelector("[data-width]")
segmented(width)
width.addEventListener("change", (e) => document.querySelector(".ix-frame").style.setProperty("--w", e.detail))

host.querySelector("[data-go]")?.setAttribute("aria-current", "true")

const themes = document.querySelector("[data-theme-switch]")
if (themes) {
  segmented(themes)
  themeSwitch(themes)
  themes.addEventListener("change", ({ detail }) => {
    const doc = frame.contentDocument
    if (!doc) return
    doc.documentElement.dataset.theme = detail
    for (const radio of doc.querySelectorAll('[data-theme-switch] [role="radio"]')) radio.setAttribute("aria-checked", String(radio.dataset.value === detail))
    doc.dispatchEvent(new Event("theme:change"))
  })
}
