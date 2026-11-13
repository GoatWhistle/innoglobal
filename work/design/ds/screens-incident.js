import { icon } from "./kit-layer.js"
import { mount } from "./screens-chart.js"
import { ARRIVAL, CROSSING, DETECT_S, fmt, HOLD, FOUND_X, SPREAD } from "./screens-data.js"
import { locationSchema, residualChart } from "./screens-incident-chart.js"
import { badge, shell } from "./screens-shell.js"

const $ = (s) => document.querySelector(s)
const s = (v) => `${fmt(v)} с`

const SEQ = [
  ["", "0,00 с", "Утечку вставили на 6 330 м", "Клик по трубе, сценарий жюри", ""],
  ["", s(ARRIVAL[3]), "Волна дошла до Д-04", "7 200 м, на 870 м ниже места", ""],
  ["", s(CROSSING[3]), "Д-04 вышел за порог 0,07 МПа", "Началась выдержка 0,4 с", "warning"],
  ["", s(ARRIVAL[2]), "Волна дошла до Д-03", "4 800 м, на 1 530 м выше места", ""],
  ["", s(CROSSING[2]), "Д-03 вышел за порог", "Второй датчик, выдержка 0,4 с", "warning"],
  ["", s(DETECT_S), "Тревога: оба датчика держат расхождение", `Удержание ${fmt(HOLD, 1)} с выполнено, место ${fmt(FOUND_X, 0)} м ± ${SPREAD} м`, "danger"],
]

const EXTRA = {
  ack: [["14:32:19", "13,0 с", "Тревогу принял Соколов А. В.", "Оператор смены, пульт НПС-2", ""]],
  shut: [["14:32:19", "13,0 с", "Тревогу принял Соколов А. В.", "Оператор смены, пульт НПС-2", ""]],
  closed: [
    ["14:32:19", "13,0 с", "Тревогу принял Соколов А. В.", "Оператор смены, пульт НПС-2", ""],
    ["14:33:02", "56,0 с", "Участок перекрыт", "Задвижки З-2 и З-3 закрыты за 38 с", ""],
  ],
  false: [["14:32:31", "25,0 с", "Отмечена ложной: Соколов А. В.", "Причина: проверка детектора, утечку вставило жюри", ""]],
}

const BADGE = {
  new: ["danger", "alarm", "Не принята"],
  ack: ["danger", "alarm", "Принята"],
  shut: ["danger", "alarm", "Принята"],
  closed: ["", "shut", "Участок перекрыт"],
  false: ["muted", "x", "Ложная"],
}

const btn = (cls, ic, label, extra = "") =>
  `<button type="button" class="button ${cls}"${extra}>${icon(ic)}<span>${label}</span></button>`

const exportBtn = btn("button-quiet", "download", "Выгрузить отчёт")

function actions(state) {
  if (state === "new")
    return `<p class="sd-h2">Решение за оператором</p><p class="sd-muted">Система не перекрывает участок сама. Примите тревогу, чтобы остановить сигнал, затем решите, перекрывать ли.</p><div class="inc-actions">${btn("button-primary", "check", "Принять тревогу")}${btn("button-danger", "shut", "Перекрыть участок", ' data-dialog="dlg-shut"')}${btn("button-secondary", "x", "Отметить ложной")}${exportBtn}</div>`
  if (state === "ack" || state === "shut")
    return `<p class="sd-h2">Тревога принята</p><p class="sd-muted">Соколов А. В. в 14:32:19. Утечка остаётся открытой, пока участок не перекрыт или тревогу не отметили ложной.</p><div class="inc-actions">${btn("button-danger", "shut", "Перекрыть участок", ' data-dialog="dlg-shut"')}${btn("button-secondary", "x", "Отметить ложной")}${exportBtn}</div>`
  if (state === "closed")
    return `<p class="sd-h2">Участок перекрыт</p><p class="sd-muted">Задвижки закрыты в 14:33:02. Открыть их можно только с пульта станции.</p><div class="inc-actions">${exportBtn}</div>`
  return `<p class="sd-h2">Отмечена ложной</p><p class="sd-muted">Тревога снята, запись осталась в журнале. Если отметка ошибочна, верните утечку в работу.</p><div class="inc-actions">${btn("button-secondary", "reset", "Вернуть в работу")}${exportBtn}</div>`
}

function render(state) {
  $("[data-badges]").innerHTML = `${badge(...BADGE[state])}<span class="sd-caption sd-num">INC-2611-0042</span>`
  $("[data-actions]").innerHTML = actions(state)
  $("[data-actions]").dataset.tone = state === "new" ? "danger" : ""
  const rows = [...SEQ].sort((a, b) => Number(a[1].replace(/[^0-9,]/g, "").replace(",", ".")) - Number(b[1].replace(/[^0-9,]/g, "").replace(",", ".")))
  $("[data-seq]").innerHTML = rows
    .map(
      ([clock, t, title, note, tone]) =>
        `<li data-tone="${tone}"><span class="seq-t sd-num">${t}</span><span class="seq-mark" aria-hidden="true"></span><div><p>${title}</p><p class="sd-caption">${note}</p></div><time class="sd-caption sd-num">${clock}</time></li>`,
    )
    .join("")
  mount($("[data-chart]"), residualChart)
  mount($("[data-loc]"), locationSchema)
  $("[data-actions]").innerHTML = `<p class="sd-h2">Вычисленный пример</p><p class="sd-muted">Данные получены из симулятора с seed 42. Управление задвижками не моделируется.</p><a class="button button-secondary" href="screen-twin.html">${icon("cube")}<span>Открыть симулятор</span></a>`
}

shell({
  screen: "journal",
  title: "Карточка утечки",
  states: [
    ["new", "Новая"],
    ["ack", "Принята"],
    ["shut", "Подтверждение перекрытия"],
    ["closed", "Участок перекрыт"],
    ["false", "Ложная"],
  ],
  parts: [
    ["Раскладка", "основная колонка 1fr и боковая --sd-panel; ниже 64rem одна колонка, действия первыми"],
    ["Шапка", "Breadcrumbs, StatusBadge, номер события (CopyButton в продукте)"],
    ["График", "невязка по датчикам во времени: порог пунктиром, выдержка штриховкой, размерная линия до тревоги"],
    ["Последовательность", "реальный порядок событий: время от начала, факт, пояснение"],
    ["Место", "чертёж пары датчиков с размерами и формула места по разнице прихода волны"],
    ["Действия", "Button primary, danger, secondary, quiet; Dialog для перекрытия"],
  ],
  line: (st) => (st === "new" || st === "ack" || st === "shut" ? "leak" : "calm"),
  render,
})
