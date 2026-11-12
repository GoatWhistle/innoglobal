import { icon } from "./kit-layer.js"

export const ROWS = [
  ["14:33:02", "shut", "", "Участок перекрыт", "Задвижки З-2 и З-3, 38 с", "Участок 2", "", null, "Соколов А. В."],
  ["14:32:19", "check", "", "Тревога принята", "Утечка № 42", "Участок 2", "", null, "Соколов А. В."],
  ["14:32:08", "alarm", "danger", "Утечка № 42", "Найдена за 2,0 с, 6 340 м ± 42 м", "6 340 м", "Д-03, Д-04", 0.28, "Система"],
  ["14:32:07", "warning", "warning", "Расхождение на Д-04", "Выше порога 0,07 МПа", "7 200 м", "Д-04", 0.21, "Система"],
  ["14:30:12", "pause", "", "Модель на паузе", "Сравнение остановлено на 1 мин 54 с", "Участок 2", "", null, "Соколов А. В."],
  ["14:21:40", "sensor-off", "muted", "Д-05 молчит 18 с", "Связь вернулась в 14:21:58", "9 600 м", "Д-05", null, "Система"],
  ["14:12:55", "warning", "warning", "Расхождение на Д-02", "Ушло ниже порога через 0,3 с", "2 400 м", "Д-02", 0.08, "Система"],
  ["14:05:31", "sliders", "", "Параметры модели изменены", "Шероховатость 0,10 мм вместо 0,05 мм", "Модель", "", null, "Ким Е. Р."],
  ["13:58:16", "alarm", "danger", "Утечка № 41", "Найдена за 2,4 с, 2 930 м ± 42 м", "2 930 м", "Д-01, Д-02", 0.31, "Система"],
  ["13:58:14", "warning", "warning", "Расхождение на Д-02", "Выше порога 0,07 МПа", "2 400 м", "Д-02", 0.19, "Система"],
  ["13:44:02", "x", "", "Утечка № 40 отмечена ложной", "Проверка детектора", "10 410 м", "Д-05, Д-06", null, "Ким Е. Р."],
  ["13:43:51", "alarm", "danger", "Утечка № 40", "Найдена за 1,9 с, 10 410 м ± 42 м", "10 410 м", "Д-05, Д-06", 0.26, "Система"],
]

const cell = (v) => (v === null ? '<span class="no-value" title="Для этого события невязки нет">нет</span>' : v.toLocaleString("ru-RU", { minimumFractionDigits: 2 }))

export function rows(list = ROWS) {
  return list
    .map(
      ([t, ic, tone, title, note, place, sensors, gap, who]) => `<tr data-tone="${tone}">
<td class="muted j-time">12.11, ${t}</td>
<td><span class="j-ev"><span class="j-ic"${tone ? ` data-tone="${tone}"` : ""}>${icon(ic)}</span><span><a href="${title.startsWith("Утечка №") ? "screen-incident.html" : "#"}" class="j-title">${title}</a><span class="sd-caption">${note}</span></span></span></td>
<td>${place}</td>
<td>${sensors || '<span class="no-value" title="Событие не привязано к датчику">нет</span>'}</td>
<td class="num">${cell(gap)}</td>
<td class="muted">${who}</td>
</tr>`,
    )
    .join("")
}

export function skeletonRows(n = 8) {
  const line = (w) => `<span class="skeleton skeleton-line" style="display:block;inline-size:${w}px"></span>`
  return Array.from({ length: n }, () => `<tr><td>${line(84)}</td><td>${line(220)}</td><td>${line(64)}</td><td>${line(56)}</td><td class="num">${line(40)}</td><td>${line(96)}</td></tr>`).join("")
}

export function stateRow(kind) {
  const body =
    kind === "empty"
      ? `<svg class="j-draw" viewBox="0 0 160 64" aria-hidden="true"><path class="j-draw-pipe" d="M0 26H160M0 38H160"/><path class="j-draw-axis" d="M0 32H160"/><path class="j-draw-dim" d="M20 54H140M16 58L24 50M136 58L144 50M20 42V58M140 42V58"/></svg><h3 class="state-title">Под фильтры ничего не подошло</h3><p class="state-text">Утечек на Д-06 за последние 30 минут не было. Снимите фильтр по датчику или расширьте период.</p><button type="button" class="button button-secondary">${icon("reset")}<span>Сбросить фильтры</span></button>`
      : `<svg class="icon state-icon" aria-hidden="true"><use href="icons.svg#server"/></svg><h3 class="state-title">Журнал не загрузился</h3><p class="state-text">Сервер не ответил за 10 с. Тревоги на участке работают: модель считает в браузере.</p><button type="button" class="button button-primary">${icon("refresh")}<span>Повторить</span></button>`
  return `<tr class="table-empty"><td colspan="6"><div class="state" data-tone="${kind === "error" ? "danger" : ""}">${body}</div></td></tr>`
}
