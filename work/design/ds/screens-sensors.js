import { icon } from "./kit-layer.js"
import { scheme } from "./runtime/scheme.js"
import { mount } from "./screens-chart.js"
import { fmt } from "./screens-data.js"
import { capture, location, neighbours, residualChart, SILENT, stateOf } from "./screens-sensors-data.js"
import { badge, shell } from "./screens-shell.js"

const $ = (s) => document.querySelector(s)
const TONE = {
  calm: ["", "check", "Норма"],
  watch: ["warning", "warning", "Наблюдение"],
  leak: ["danger", "alarm", "Утечка"],
  silent: ["muted", "sensor-off", `Молчит ${SILENT.seconds} с`],
}
const SCALE = 0.3
let data = null
let silent = false
let selected = 3
let redraw = () => {}

const noValue = (why) => `<span class="no-value" title="${why}">нет данных</span>`

function row(i) {
  const s = data.snap.sensors[i]
  const st = stateOf(data.snap, i, silent)
  const [tone, ic, text] = TONE[st]
  const gap = Math.max(0, s.residual)
  const quiet = st === "silent"
  return `<li><button type="button" class="sr sn-item" data-state="${st}" data-index="${i}" aria-pressed="${i === selected}">
<span class="sr-id"><b>Д-0${i + 1}</b><span class="sd-caption">${fmt(s.x / 1000, 1)} км</span></span>
<span class="sr-state"${tone ? ` data-tone="${tone}"` : ""}>${icon(ic)}<span>${text}</span></span>
<span class="sr-p">${quiet ? noValue("Датчик молчит, показание не обновляется") : `<span class="sd-readout-sm">${fmt(s.measured)}</span><span class="sd-unit">МПа</span>`}<span class="sd-caption">модель ${fmt(s.model)}</span></span>
<span class="sr-gap"><span class="sr-gap-value">${quiet ? noValue("Расхождение не считается без показаний") : `${fmt(gap)} МПа`}</span><span class="meter" style="--k:${quiet ? 0 : Math.min(1, gap / SCALE).toFixed(3)}" aria-hidden="true"><span class="meter-fill"></span><span class="meter-limit"></span></span></span>
</button></li>`
}

function notice(i, st) {
  if (st === "silent")
    return `<div class="banner" data-tone="system" role="status">${icon("sensor-off")}<p class="banner-text"><b>Д-0${i + 1} молчит ${SILENT.seconds} с.</b> Участок 9 600–12 000 м слушает только Д-05. Утечку там увидим, но место определится с точностью ± 1 200 м вместо ± 50 м.</p><div class="banner-actions"><button type="button" class="button button-secondary button-sm">${icon("refresh")}<span>Проверить связь</span></button></div></div>`
  const d = data.snap.detection
  if (st === "leak" && d)
    return `<div class="banner" data-tone="danger" role="status">${icon("alarm")}<p class="banner-text"><b>Пара Д-0${d.pair[0]} и Д-0${d.pair[1]} подтвердила утечку.</b> Расхождение выше ${fmt(data.snap.threshold)} МПа держалось ${fmt(data.snap.hold, 1)} с. Место ${fmt(Math.round(d.x / 10) * 10, 0)} м ± ${fmt(Math.ceil(d.spread / 10) * 10, 0)} м.</p><div class="banner-actions"><a class="button button-secondary button-sm" href="screen-incident.html">${icon("arrow-right")}<span>Открыть утечку</span></a></div></div>`
  return ""
}

function detail() {
  const i = selected
  const s = data.snap.sensors[i]
  const st = stateOf(data.snap, i, silent)
  const quiet = st === "silent"
  $("[data-detail]").innerHTML = `<div class="sn-head"><div><h1 class="sd-h1" id="sn-title">Д-0${i + 1}</h1><p class="sd-caption">Давление, ${location(data.snap, i)}</p></div>${badge(...TONE[st])}</div>
${notice(i, st)}
<dl class="stats sn-stats"><div><dt>Показание</dt><dd>${quiet ? noValue("Последнее показание старше 47 с") : `${fmt(s.measured)} <small>МПа</small>`}</dd></div><div><dt>Модель</dt><dd>${fmt(s.model)} <small>МПа</small></dd></div><div><dt>Расхождение</dt><dd>${quiet ? noValue("Без показаний расхождение не считается") : `${fmt(Math.max(0, s.residual))} <small>МПа</small>`}</dd></div><div><dt>Последний отсчёт</dt><dd>${quiet ? `${SILENT.seconds} <small>с назад</small>` : "<small>только что</small>"}</dd></div></dl>
<section class="sn-block" aria-labelledby="sn-chart"><h2 class="sd-h2" id="sn-chart">Расхождение модели и показаний</h2><div class="sn-chart" data-chart></div></section>
<section class="sn-block" aria-labelledby="sn-place"><h2 class="sd-h2" id="sn-place">Место на участке</h2><div class="sn-scheme">${scheme(data.snap, i, null, 800)}</div></section>
<section class="sn-block" aria-labelledby="sn-pass"><h2 class="sd-h2" id="sn-pass">Паспорт</h2><dl class="facts sn-facts"><dt>Измеряет</dt><dd>давление в трубе</dd><dt>Координата</dt><dd>${fmt(s.x, 0)} м</dd><dt>Соседи</dt><dd>${neighbours(i)}</dd><dt>Опрос</dt><dd>100 раз в секунду</dd><dt>Сглаживание</dt><dd>0,12 с</dd><dt>Тревога</dt><dd>выше ${fmt(data.snap.threshold)} МПа дольше ${fmt(data.snap.hold, 1)} с вместе с соседом</dd></dl></section>`
  redraw = mount($("[data-chart]"), residualChart(data, i, quiet))
}

function draw() {
  $("[data-list]").innerHTML = data.snap.sensors.map((_, i) => row(i)).join("")
  const alarms = data.snap.sensors.filter((_, i) => stateOf(data.snap, i, silent) !== "calm").length
  $("[data-count]").textContent = alarms ? `Шесть датчиков давления, требуют внимания ${alarms}` : "Шесть датчиков давления, все в норме"
  detail()
}

function render(state) {
  silent = state === "silent"
  data = capture(state === "alarm")
  selected = silent ? SILENT.index : 3
  draw()
  $("[data-list]").addEventListener("click", (e) => {
    const item = e.target.closest("[data-index]")
    if (!item) return
    selected = Number(item.dataset.index)
    draw()
    $(`[data-index="${selected}"]`).focus()
  })
}

shell({
  screen: "sensors",
  title: "Датчики",
  states: [["normal", "Норма"], ["alarm", "Тревога"], ["silent", "Датчик молчит"]],
  parts: [
    ["Раскладка", "список --sd-list слева, карточка датчика 1fr; ниже 64rem список над карточкой"],
    ["Строка", "SensorRow: имя и километр, StatusBadge, показание и модель, полоса расхождения с отметкой порога"],
    ["Карточка", "Stat в четыре ячейки, график расхождения с порогом, схема участка, паспорт Facts"],
    ["Молчание", "NoValue вместо чисел, полоса «нет данных» на графике, Banner о потере точности"],
    ["Данные", "тот же симулятор с зерном 42; молчание Д-06 наложено шаблоном, симулятор датчики не отключает"],
  ],
  line: (state) => state === "alarm" ? "leak" : "calm",
  onTheme: () => redraw(),
  render,
})
