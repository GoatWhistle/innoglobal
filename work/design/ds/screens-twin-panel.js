import { icon } from "./kit-layer.js"
import { DETECT_S, FOUND_X, fmt, LEAK_X, residualAt, SENSORS, sensorState, SPREAD, unit } from "./screens-data.js"
import { badge } from "./screens-shell.js"

const SCALE = 0.3

const TONE = {
  calm: null,
  watch: ["warning", "warning", "Наблюдение"],
  leak: ["danger", "alarm", "Утечка"],
  silent: ["muted", "sensor-off", "Молчит 18 с"],
}

export const TIME = { calm: null, watch: 1.3, leak: 6.1, ack: 6.1, nogl: 6.1, offline: null }

export function sensorRows(state) {
  const t = TIME[state]
  const detected = t !== null && t >= DETECT_S
  return SENSORS.map((s, i) => {
    const r = t === null ? residualAt(i, -0.3) : residualAt(i, t)
    const st = t === null ? "calm" : sensorState(i, t, detected)
    const tone = TONE[st]
    const mark = tone
      ? `<span class="sr-state" data-tone="${tone[0]}">${icon(tone[1])}<span>${tone[2]}</span></span>`
      : `<span class="sr-state">${icon("check")}<span>Норма</span></span>`
    const share = Math.max(0, Math.min(1, r / SCALE))
    return `<li class="sr" data-state="${st}">
<span class="sr-id"><b>${s.id}</b><span class="sd-caption">${fmt(s.x / 1000, 1)} км</span></span>
${mark}
<span class="sr-p"><span class="sd-readout-sm">${fmt(s.model - r)}</span><span class="sd-unit">МПа</span><span class="sd-caption">модель ${fmt(s.model)}</span></span>
<span class="sr-gap"><span class="sr-gap-value">${unit(Math.max(0, r), "МПа")}</span><span class="meter" style="--k:${share.toFixed(3)}" role="meter" aria-valuemin="0" aria-valuemax="${SCALE}" aria-valuenow="${Math.max(0, r).toFixed(3)}" aria-label="Невязка ${s.id}"><span class="meter-fill"></span><span class="meter-limit"></span></span></span>
</li>`
  }).join("")
}

const insert = `<button type="button" class="button button-secondary">${icon("leak-insert")}<span>Вставить утечку</span></button>`

export function statusBlock(state) {
  if (state === "calm" || state === "offline")
    return `<p class="sd-caption">Участок 2, шесть датчиков давления</p>
<p class="twin-figure">Утечек нет</p>
<p class="twin-text">Модель и замер сходятся: наибольшая невязка ${unit(0.01, "МПа")} на Д-03 при пороге ${unit(0.07, "МПа")}.</p>
<div class="sd-row">${insert}</div>`
  if (state === "watch")
    return `<div class="sd-row">${badge("warning", "warning", "Наблюдение", false)}<span class="sd-caption">с 14:32:07,1</span></div>
<p class="twin-timer"><span class="sd-readout">${fmt(1.3, 1)}</span><span class="sd-unit">с</span><span class="sd-caption">идёт поиск</span></p>
<p class="twin-text">Д-04 ниже модели на ${unit(residualAt(3, TIME.watch), "МПа")}. Тревога включится, когда соседний датчик тоже разойдётся с моделью дольше 0,4 с.</p>`
  const ack = state === "ack"
  const head = `<div class="sd-row">${badge("danger", "alarm", ack ? "Утечка, принята" : "Утечка")}<a class="twin-link" href="screen-incident.html${ack ? "?state=ack" : ""}">Утечка № 42${icon("chevron-right")}</a></div>`
  const facts = `<dl class="twin-pair"><div><dt>Найдена за</dt><dd><span class="sd-readout">${fmt(DETECT_S, 1)}</span><span class="sd-unit">с</span></dd></div><div><dt>Место</dt><dd><span class="sd-readout">${fmt(FOUND_X, 0)}</span><span class="sd-unit">м</span><span class="sd-caption">± ${SPREAD} м</span></dd></div></dl>`
  const text = `<p class="twin-text">Между Д-03 и Д-04. Утечку вставили на ${fmt(LEAK_X, 0)} м, ошибка места ${unit(FOUND_X - LEAK_X, "м", 0)}.</p>`
  const who = ack ? `<p class="twin-ack">${icon("check")}<span>Принял Соколов А. В. в 14:32:19</span></p>` : ""
  const actions = ack
    ? `<button type="button" class="button button-danger" data-dialog="dlg-shut">${icon("shut")}<span>Перекрыть участок</span></button><button type="button" class="button button-quiet">${icon("reset")}<span>Сбросить сценарий</span></button>`
    : `<button type="button" class="button button-primary">${icon("check")}<span>Принять</span></button><button type="button" class="button button-danger" data-dialog="dlg-shut">${icon("shut")}<span>Перекрыть участок</span></button>`
  return `${head}${facts}${text}${who}<div class="sd-row twin-actions">${actions}</div>`
}

export function schemaFallback() {
  const x = (m) => 24 + (m / 12000) * 752
  const sensors = SENSORS.map((s, i) => {
    const cls = i === 2 || i === 3 ? " is-alarm" : ""
    return `<g class="schema-sensor${cls}"><path d="M${x(s.x)} 76v14"/><circle cx="${x(s.x)}" cy="96" r="5"/><text x="${x(s.x)}" y="118" text-anchor="middle">${s.id}</text></g>`
  }).join("")
  const lx = x(FOUND_X)
  const half = (SPREAD / 12000) * 752
  return `<div class="banner" role="status">${icon("cube")}<p class="banner-text"><b>3D-сцена недоступна:</b> браузер не поддерживает WebGL 2. Показываем схему участка, поиск утечки и тревоги работают как обычно.</p></div>
<svg class="schema twin-schema" viewBox="0 0 800 140" role="img" aria-label="Схема участка: утечка на ${fmt(FOUND_X, 0)} м между Д-03 и Д-04"><path class="schema-pipe" d="M24 56H776M24 76H776"/><rect class="schema-leak-zone" x="${lx - half - 4}" y="56" width="${half * 2 + 8}" height="20"/><path class="schema-leak" d="M${lx - half - 4} 56H${lx + half + 4}M${lx - half - 4} 76H${lx + half + 4}"/><text class="schema-leak-text" x="${lx}" y="36" text-anchor="middle">Утечка, ${fmt(FOUND_X, 0)} м</text>${sensors}</svg>`
}
