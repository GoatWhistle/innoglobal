import { icon } from "../kit-layer.js"
import { badge } from "../screens-shell.js"
import { meters } from "./scheme.js"

export const num = (v, digits = 2) => Number(v).toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits })
export const labels = { calm: "Утечек нет", search: "Ожидаем расхождение", deviation: "Появилось расхождение", watch: "Наблюдение", leak: "Утечка обнаружена", ack: "Принята оператором" }
export const tone = (phase) => ["leak", "ack"].includes(phase) ? "danger" : phase === "watch" ? "warning" : ""
export const symbol = (phase) => tone(phase) === "danger" ? "alarm" : tone(phase) === "warning" ? "warning" : "check"

export function panelMarkup() {
  return `<div class="sd-row" data-state-label role="status"></div>
<p class="sd-caption twin-timing" data-timing-caption></p>
<h2 class="twin-figure" data-result>Утечек нет</h2>
<dl class="twin-facts"><div><dt>Предполагаемое место</dt><dd data-location>Поиск не требуется</dd></div><div><dt>Максимальное расхождение</dt><dd><span data-gap>0,00</span> <span class="sd-unit">МПа</span></dd></div></dl>
<p class="twin-text" data-explanation></p>
<form class="twin-insert" data-insert><label for="coordinate">Место утечки, м</label><div class="twin-input-row"><span class="input"><input id="coordinate" name="coordinate" inputmode="decimal" value="6330" aria-describedby="coordinate-error"></span><button class="button button-secondary" type="submit">${icon("leak-insert")}<span>Вставить</span></button></div><p id="coordinate-error" class="twin-validation" role="status"></p></form>
<div class="sd-row"><button class="button button-primary" data-accept hidden>${icon("check")}<span>Принять тревогу</span></button><button class="button button-secondary" data-reset hidden>${icon("reset")}<span>Сбросить</span></button></div>
<p class="sd-caption" data-preview hidden>Вычисленный пример остановлен на событии. Сбросьте, чтобы запустить свой сценарий.</p>`
}

export function updatePanel(root, sim, oldPhase) {
  const q = (s) => root.querySelector(s)
  const found = sim.detection
  const p = sim.phase
  const max = Math.max(...sim.sensors.map((s) => Math.abs(s.residual)))
  if (p !== oldPhase) {
    q("[data-state-label]").innerHTML = badge(tone(p), symbol(p), labels[p])
    q("[data-result]").textContent = found ? `${num(found.seconds, 1)} с` : labels[p]
    q("[data-result]").dataset.tone = tone(p)
  }
  if (sim.leak) q("[data-result]").textContent = `${num(found ? found.seconds : sim.age, 1)} с`
  q("[data-timing-caption]").textContent = found ? "Время обнаружения" : sim.leak ? "После вставки" : "Состояние участка"
  q("[data-result]").setAttribute("aria-label", found ? `Время обнаружения ${num(found.seconds, 1)} с` : labels[p])
  q("[data-location]").textContent = found ? `${meters(found.x)} ± ${meters(Math.ceil(found.spread / 10) * 10)}` : sim.leak ? "Определяется по датчикам" : "Поиск не требуется"
  q("[data-gap]").textContent = num(max)
  q("[data-gap]").dataset.tone = tone(p)
  q("[data-explanation]").textContent = found
    ? `Два датчика превысили ${num(sim.threshold)} МПа на ${num(sim.hold, 1)} с. Вставлена на ${meters(sim.leak.x)}; ошибка места ${meters(found.error)}.`
    : sim.leak ? `С момента вставки ${num(sim.age, 1)} с. Для подтверждения нужны два датчика выше ${num(sim.threshold)} МПа в течение ${num(sim.hold, 1)} с.`
    : `Модель и показания сходятся. Порог подтверждения ${num(sim.threshold)} МПа, выдержка ${num(sim.hold, 1)} с.`
  q("[data-insert]").hidden = Boolean(sim.leak)
  q("[data-accept]").hidden = !found || p === "ack"
  q("[data-reset]").hidden = !sim.leak
  q("[data-preview]").hidden = !sim.paused
}

export function sensorTable(sim, selected) {
  return sim.sensors.map((s, i) => `<button type="button" class="sensor-reading" data-sensor="${i}" aria-pressed="${i === selected}"><span>Д-0${s.id}</span><span class="sd-caption">${meters(s.x)}</span><span><span data-reading>${num(s.measured)}</span> <span class="sd-unit">МПа</span></span><span class="sd-caption">модель ${num(s.model)}</span><span data-tone="${s.state === 2 ? "danger" : s.state === 1 ? "warning" : ""}">${icon(s.state === 2 ? "alarm" : s.state === 1 ? "warning" : "check")} <span data-residual>${num(s.residual)}</span> МПа</span></button>`).join("")
}

export function updateSensorTable(root, sim, selected) {
  if (!root.children.length) root.innerHTML = sensorTable(sim, selected)
  for (const el of root.children) {
    const index = Number(el.dataset.sensor)
    const sensor = sim.sensors[index]
    el.setAttribute("aria-pressed", String(index === selected))
    el.querySelector("[data-reading]").textContent = num(sensor.measured)
    el.querySelector("[data-residual]").textContent = num(sensor.residual)
    const state = el.querySelector("[data-tone]")
    state.dataset.tone = sensor.state === 2 ? "danger" : sensor.state === 1 ? "warning" : ""
    state.querySelector("use").setAttribute("href", `icons.svg#${sensor.state === 2 ? "alarm" : sensor.state === 1 ? "warning" : "check"}`)
  }
}
