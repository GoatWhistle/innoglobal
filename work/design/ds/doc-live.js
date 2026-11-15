const STATES = {
  live: ["clock", "прогноз от 14.11", "check", "Прогноз свежий: посчитан по ВТД 2024 года."],
  delayed: ["timer", "пересчёт идёт", "timer", "Загружено ВТД 2026 года. Пока показан прогноз от 12.11."],
  stale: ["clock", "ВТД 2021 года", "sensor-off", "Прошлому ВТД больше трёх лет. Разброс P10–P90 шире."],
  offline: ["offline", "из кеша, 14.11", "offline", "Сервер не отвечает 32 с. Показан прогноз из кеша, подключимся сами."],
  paused: ["pause", "пауза", "pause", "Пауза. Пересчёт прогноза стоит, выбор сегмента работает."],
  replay: ["reset", "сравнение с 2024", "reset", "Прогноз на 2024 год против его замера. Действия недоступны."],
}

const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="icons.svg#${id}"/></svg>`

function apply(key) {
  const [freshIcon, fresh, lineIcon, line] = STATES[key]
  for (const ro of document.querySelectorAll("[data-live-view] .ro")) ro.dataset.live = key
  for (const node of document.querySelectorAll("[data-live-view] [data-fresh]"))
    node.innerHTML = `${icon(freshIcon)}<span>${fresh}</span>`
  for (const node of document.querySelectorAll("[data-live-view] [data-live-line]"))
    node.innerHTML = `${icon(lineIcon)}<span>${line}</span>`
  for (const button of document.querySelectorAll("[data-live-pick]"))
    button.setAttribute("aria-pressed", String(button.dataset.livePick === key))
}

for (const button of document.querySelectorAll("[data-live-pick]"))
  button.addEventListener("click", () => apply(button.dataset.livePick))

if (document.querySelector("[data-live-pick]")) apply("live")
