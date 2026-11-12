import { rows, skeletonRows, stateRow } from "./screens-journal-rows.js"
import { shell } from "./screens-shell.js"

const $ = (s) => document.querySelector(s)

function render(state) {
  const body = $("[data-rows]")
  const table = $("[data-table]")
  table.toggleAttribute("aria-busy", state === "loading")
  $("[data-pages]").hidden = state !== "default"
  const q = $("[data-query]")
  q.value = state === "empty" ? "Д-06" : ""
  q.closest(".input").toggleAttribute("data-empty", !q.value)
  $("[data-count]").textContent =
    state === "default"
      ? "284 события за сегодня, по фильтрам 28"
      : state === "empty"
        ? "По запросу Д-06 за 30 минут ничего"
        : state === "loading"
          ? "Загружаем события за сегодня"
          : "Нет ответа от сервера"
  body.innerHTML = state === "default" ? rows() : state === "loading" ? skeletonRows() : stateRow(state)
}

shell({
  screen: "journal",
  title: "Журнал событий",
  states: [
    ["default", "События"],
    ["loading", "Загрузка"],
    ["empty", "Пусто по фильтрам"],
    ["error", "Ошибка"],
  ],
  parts: [
    ["Раскладка", "фильтры слева --sd-rail 280px и таблица 1fr; ниже 75rem фильтры прячутся за кнопкой"],
    ["Фильтры", "DateRange, Tag aria-pressed с числом, Select, Button quiet для сброса"],
    ["Таблица", "Table с липкой шапкой, сортировка по времени, числа справа, NoValue вместо прочерка"],
    ["Строка", "иконка типа, заголовок-ссылка, пояснение caption; утечка ведёт в карточку"],
    ["Состояния", "Skeleton через 200 мс, EmptyState с чертежом, ErrorState с Повторить"],
    ["Узко", "ниже 48rem строка становится карточкой из двух строк, шапка скрыта"],
  ],
  line: () => "calm",
  render,
})
