const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="icons.svg#${id}"/></svg>`
const badge = (tone, id, text) =>
  `<span class="badge badge-sm"${tone ? ` data-tone="${tone}"` : ""}>${icon(id)}<span>${text}</span></span>`
const button = (cls, id, text) =>
  `<button type="button" class="button ${cls} button-sm">${icon(id)}<span>${text}</span></button>`

const STATES = {
  calm: {
    title: "Труба 1 | duppel",
    badge: badge("", "check", "Список проверки пуст"),
    banner: "",
    row: ["", "check", "Норма", "Сегмент 631, 6 310 м", "5,62"],
    scene: "Стенка ровная, срез трубы спокоен",
  },
  watch: {
    title: "Труба 1 | duppel",
    badge: badge("warning", "warning", "Внимание"),
    banner: "",
    row: ["warning", "warning", "Утонение выше среднего", "Сегмент 631, 6 310 м", "4,98"],
    scene: "Янтарное пятно на развёртке у 6 ч",
  },
  leak: {
    title: "Сегмент 630 | duppel",
    badge: badge("danger", "alarm", "В списке проверки"),
    banner: `<div class="banner" data-tone="danger" role="alert">${icon("alarm")}<p class="banner-text"><b>Сегмент 630: 4,86 мм на дату T.</b> В 10% самых тонких.</p><div class="banner-actions">${button("button-secondary", "check", "Принять в план")}${button("button-quiet", "pipe", "Открыть сегмент")}</div></div>`,
    row: ["danger", "alarm", "Приоритет", "Сегмент 630, 6 300 м", "4,86"],
    scene: "Срез на 6 300 м, выноска толщины",
  },
  accepted: {
    title: "Сегмент 630 | duppel",
    badge: badge("danger", "alarm", "В плане ВТД"),
    banner: `<div class="banner" data-tone="danger" role="status">${icon("check")}<p class="banner-text"><b>Сегмент 630 в плане с 14.11.</b> Срок проверки выбирает инженер.</p><div class="banner-actions">${button("button-quiet", "x", "Убрать из плана")}</div></div>`,
    row: ["danger", "alarm", "В плане", "Сегмент 630, 6 300 м", "4,86"],
    scene: "Отметка на трассе без пульсации",
  },
  closed: {
    title: "Труба 1 | duppel",
    badge: badge("", "check", "Список проверки пуст"),
    banner: `<div class="toast toast-static" role="status">${icon("check")}<p class="toast-text"><b>Контрольное ВТД загружено</b><span>Замер 4,91 мм, прогноз 4,86 мм. Запись в журнале.</span></p></div>`,
    row: ["", "check", "Проверен", "Сегмент 630, 6 300 м", "4,91"],
    scene: "Замер рядом с прогнозом на профиле",
  },
  false: {
    title: "Труба 1 | duppel",
    badge: badge("", "check", "Список проверки пуст"),
    banner: `<div class="toast toast-static" role="status">${icon("info")}<p class="toast-text"><b>Сегмент снят с проверки</b><span>Причина в журнале. Правило отбора не меняется само.</span></p></div>`,
    row: ["", "info", "Снят", "Сегмент 630, 6 300 м", "4,86"],
    scene: "Отметка в журнале",
  },
}

function apply(key) {
  const state = STATES[key]
  const [tone, rowIcon, rowText, place, delta] = state.row
  for (const view of document.querySelectorAll("[data-life-view]")) {
    view.querySelector("[data-life-title]").textContent = state.title
    view.querySelector("[data-life-dot]").hidden = !state.title.startsWith("Сегмент")
    view.querySelector("[data-life-badge]").innerHTML = state.badge
    view.querySelector("[data-life-banner]").innerHTML = state.banner
    const row = view.querySelector("[data-life-row]")
    row.dataset.tone = tone
    row.innerHTML = `<span>${place}</span><span class="fig">${delta}&nbsp;мм</span>${badge(tone, rowIcon, rowText)}`
    view.querySelector("[data-life-scene]").textContent = state.scene
  }
  for (const pick of document.querySelectorAll("[data-life]"))
    pick.setAttribute("aria-pressed", String(pick.dataset.life === key))
}

for (const pick of document.querySelectorAll("[data-life]"))
  pick.addEventListener("click", () => apply(pick.dataset.life))

if (document.querySelector("[data-life]")) apply("leak")
