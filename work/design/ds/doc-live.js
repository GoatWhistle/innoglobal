const STATES = {
  live: ["clock", "обновлено 1 с назад", "check", "Детекция работает. Такт 1 с."],
  delayed: ["timer", "обновлено 6 с назад", "timer", "Данные идут с задержкой 6 с. Детекция работает."],
  stale: ["clock", "обновлено в 14:02:11", "sensor-off", "Показания старше 10 с. Детекция приостановлена."],
  offline: ["offline", "обновлено в 14:01:48", "offline", "Нет связи с сервером 32 с. Подключимся сами."],
  paused: ["pause", "пауза в 14:02:11", "pause", "Пауза. Вставить утечку нельзя, детекция стоит."],
  replay: ["reset", "повтор 14:02:11", "reset", "Повтор записи 14:01:40–14:02:30. Действия недоступны."],
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
