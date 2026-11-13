const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="icons.svg#${id}"/></svg>`
const badge = (tone, id, text) =>
  `<span class="badge badge-sm"${tone ? ` data-tone="${tone}"` : ""}>${icon(id)}<span>${text}</span></span>`
const button = (cls, id, text) =>
  `<button type="button" class="button ${cls} button-sm">${icon(id)}<span>${text}</span></button>`

const STATES = {
  calm: {
    title: "Участок Север | duppel",
    badge: badge("", "check", "Утечек нет"),
    banner: "",
    row: ["", "check", "Норма", "Д-04, 7 200 м", "−0,01"],
    scene: "Сцена спокойна, нефть течёт",
  },
  watch: {
    title: "Участок Север | duppel",
    badge: badge("warning", "warning", "Наблюдение"),
    banner: "",
    row: ["warning", "warning", "Наблюдение 0,2 с", "Д-04, 7 200 м", "−0,05"],
    scene: "Кольцо янтаря у Д-04, без звука",
  },
  leak: {
    title: "Утечка 6 340 м | duppel",
    badge: badge("danger", "alarm", "Утечка"),
    banner: `<div class="banner" data-tone="danger" role="alert">${icon("alarm")}<p class="banner-text"><b>Утечка на 6 340 м ± 50 м.</b> Обнаружено за 2,0 с по Д-03 и Д-04.</p><div class="banner-actions">${button("button-secondary", "check", "Принять")}${button("button-danger", "shut", "Перекрыть участок")}</div></div>`,
    row: ["danger", "alarm", "Утечка", "Д-04, 7 200 м", "−0,28"],
    scene: "Место утечки, выноска, нефть на грунте",
  },
  accepted: {
    title: "Утечка 6 340 м | duppel",
    badge: badge("danger", "alarm", "Утечка принята"),
    banner: `<div class="banner" data-tone="danger" role="status">${icon("check")}<p class="banner-text"><b>Утечка на 6 340 м принята в 14:02:31.</b> Решение о перекрытии за оператором.</p><div class="banner-actions">${button("button-danger", "shut", "Перекрыть участок")}${button("button-quiet", "x", "Ложная тревога")}</div></div>`,
    row: ["danger", "alarm", "Принята", "Д-04, 7 200 м", "−0,28"],
    scene: "Место утечки без пульсации",
  },
  closed: {
    title: "Участок Север | duppel",
    badge: badge("", "check", "Утечек нет"),
    banner: `<div class="toast toast-static" role="status">${icon("check")}<p class="toast-text"><b>Утечка на 6 340 м устранена</b><span>Запись в журнале, 14:09:02.</span></p></div>`,
    row: ["", "check", "Устранена", "Д-04, 7 200 м", "−0,01"],
    scene: "Отметка в журнале, на сцене ничего",
  },
  false: {
    title: "Участок Север | duppel",
    badge: badge("", "check", "Утечек нет"),
    banner: `<div class="toast toast-static" role="status">${icon("info")}<p class="toast-text"><b>Отмечено как ложная тревога</b><span>Причина в журнале. Порог не меняется сам.</span></p></div>`,
    row: ["", "info", "Ложная", "Д-04, 7 200 м", "−0,01"],
    scene: "Отметка в журнале",
  },
}

function apply(key) {
  const state = STATES[key]
  const [tone, rowIcon, rowText, place, delta] = state.row
  for (const view of document.querySelectorAll("[data-life-view]")) {
    view.querySelector("[data-life-title]").textContent = state.title
    view.querySelector("[data-life-dot]").hidden = !state.title.startsWith("Утечка")
    view.querySelector("[data-life-badge]").innerHTML = state.badge
    view.querySelector("[data-life-banner]").innerHTML = state.banner
    const row = view.querySelector("[data-life-row]")
    row.dataset.tone = tone
    row.innerHTML = `<span>${place}</span><span class="fig">${delta}&nbsp;МПа</span>${badge(tone, rowIcon, rowText)}`
    view.querySelector("[data-life-scene]").textContent = state.scene
  }
  for (const pick of document.querySelectorAll("[data-life]"))
    pick.setAttribute("aria-pressed", String(pick.dataset.life === key))
}

for (const pick of document.querySelectorAll("[data-life]"))
  pick.addEventListener("click", () => apply(pick.dataset.life))

if (document.querySelector("[data-life]")) apply("leak")
