import { numberField } from "./kit-controls.js"
import { icon } from "./kit-layer.js"
import { legend, mount, profileChart } from "./screens-chart.js"
import { check, evaluate, FIELDS, FIXED, fmt, LEAK_AT, NOISE, parse, SAVED, series } from "./screens-model-calc.js"
import { badge, shell } from "./screens-shell.js"

const $ = (s) => document.querySelector(s)
const PRESETS = {
  clean: {},
  edited: { flow: 1650 },
  warning: { threshold: 0.02 },
  error: { flow: 1650, wave: "3 500" },
  running: { flow: 1650 },
}
let saved = { ...SAVED }
let baseline = evaluate(saved)
let last = { ...saved }
let busy = false
let draw = () => ""
let redraw = () => {}

const field = (f) => `<div class="field" data-field="${f.key}"><div class="field-top"><label class="field-label" for="md-${f.key}">${f.label}</label></div><div class="input input-number" data-number data-min="${f.min}" data-max="${f.max}" data-step="${f.step}" data-digits="${f.digits}"><button type="button" class="step" aria-label="Меньше" tabindex="-1">${icon("minus")}</button><input id="md-${f.key}" inputmode="decimal" aria-describedby="md-${f.key}-m"><span class="input-unit">${f.unit}</span><button type="button" class="step" aria-label="Больше" tabindex="-1">${icon("plus")}</button></div><p class="field-message" id="md-${f.key}-m"></p></div>`

const input = (key) => $(`#md-${key}`)
const read = () => Object.fromEntries(FIELDS.map((f) => [f.key, parse(input(f.key).value)]))
const changed = (values) => FIELDS.filter((f) => Number.isFinite(values[f.key]) && Math.abs(values[f.key] - saved[f.key]) > f.step / 4)
const words = (n) => n === 1 ? "параметр" : n < 5 ? "параметра" : "параметров"
const signed = (v, digits, unitText) => Math.abs(v) < 10 ** -digits / 2 ? "без изменений" : `${v > 0 ? "+" : "−"}${fmt(Math.abs(v), digits)} ${unitText}`

function message(f, values, errors, margin) {
  const el = $(`[data-field="${f.key}"]`)
  const text = el.querySelector(".field-message")
  const was = changed(values).includes(f) ? `Было ${fmt(saved[f.key], f.digits)} ${f.unit}. ` : ""
  let state = "", body = `${was}${f.note}`
  if (errors[f.key]) { state = "error"; body = errors[f.key] }
  else if (f.key === "threshold" && margin < 3) { state = "warning"; body = `${was}Всего в ${fmt(margin, 1)} раза выше шума модели`}
  el.dataset.state = busy ? "disabled" : state
  input(f.key).setAttribute("aria-invalid", String(state === "error"))
  text.innerHTML = state ? `${icon(state === "error" ? "error" : "warning")}<span>${body}</span>` : `<span>${body}</span>`
}

function rows(now, next) {
  const det = (r) => r.detection
  const place = (r) => det(r) ? `${fmt(Math.round(det(r).x / 10) * 10, 0)} м ± ${fmt(Math.ceil(det(r).spread / 10) * 10, 0)} м` : "не найдена"
  const time = (r) => det(r) ? `${fmt(det(r).seconds, 1)} с` : "не найдена"
  const list = [
    ["Давление на выходе", `${fmt(now.outlet)} МПа`, `${fmt(next.outlet)} МПа`, signed(next.outlet - now.outlet, 2, "МПа")],
    ["Перепад на 12 км", `${fmt(now.drop)} МПа`, `${fmt(next.drop)} МПа`, signed(next.drop - now.drop, 2, "МПа")],
    [`Утечка на ${fmt(LEAK_AT, 0)} м найдена за`, time(now), time(next), det(now) && det(next) ? signed(det(next).seconds - det(now).seconds, 1, "с") : "нет оценки"],
    ["Место по датчикам", place(now), place(next), det(now) && det(next) ? signed(Math.round(det(next).x / 10) * 10 - Math.round(det(now).x / 10) * 10, 0, "м") : "нет оценки"],
    ["Запас порога над шумом", `в ${fmt(now.margin, 1)} раза`, `в ${fmt(next.margin, 1)} раза`, signed(next.margin - now.margin, 1, "")],
  ]
  return list.map(([k, a, b, d]) => `<tr><th scope="row">${k}</th><td class="num">${a}</td><td class="num">${b}</td><td class="num">${d}</td></tr>`).join("")
}

function refresh() {
  const values = read()
  const errors = check(values)
  const valid = !Object.keys(errors).length
  last = Object.fromEntries(FIELDS.map((f) => [f.key, errors[f.key] ? last[f.key] : values[f.key]]))
  const next = evaluate(last)
  const dirty = changed(values)
  for (const f of FIELDS) message(f, values, errors, next.margin)
  const bad = Object.keys(errors).length
  $("[data-badge]").innerHTML = busy ? badge("", "refresh", "Применяем") : bad ? badge("danger", "error", "Ошибка в полях") : dirty.length ? badge("warning", "edit", `Не применено: ${dirty.length}`) : badge("", "check", "Совпадает с участком")
  $("[data-dirty]").textContent = bad ? `Исправьте ${bad} ${words(bad)}, чтобы применить` : dirty.length ? `Изменено ${dirty.length} ${words(dirty.length)}: ${dirty.map((f) => f.label.toLowerCase()).join(", ")}` : "Правок нет"
  $("[data-note]").textContent = busy ? "Участок переходит на новые параметры, показания продолжают сравниваться со старой моделью" : bad ? "Превью по последним верным значениям" : dirty.length ? "Пунктир: модель на участке. Сплошная: после правки" : "Измените параметр слева, превью пересчитается сразу"
  $("[data-body]").classList.toggle("stale", Boolean(bad) || busy)
  $("[data-body]").setAttribute("aria-busy", String(busy))
  $("[data-banner]").innerHTML = valid && next.margin < 3
    ? `<div class="banner" data-tone="warning" role="status">${icon("warning")}<p class="banner-text"><b>Порог близок к шуму.</b> Порог ${fmt(last.threshold)} МПа всего в ${fmt(next.margin, 1)} раза выше шума модели ${fmt(NOISE, 3)} МПа. Реальные датчики шумят сильнее, поэтому ждите ложных тревог.</p></div>`
    : ""
  $("[data-apply]").disabled = !valid || !dirty.length || busy
  $("[data-revert]").disabled = !dirty.length && valid || busy
  $("[data-compare]").innerHTML = rows(baseline, next)
  $("[data-method]").textContent = `Профиль считается по формуле Альтшуля с вязкостью по температуре Шухова. Время и место утечки на ${fmt(LEAK_AT, 0)} м даёт тот же симулятор с зерном 42; шум модели ${fmt(NOISE, 3)} МПа взят как максимум расхождения за 30 с без утечки.`
  const lo = Math.floor(Math.min(...baseline.model, ...next.model) * 2 - 0.4) / 2
  const hi = Math.ceil(Math.max(...baseline.model, ...next.model) * 2 + 0.2) / 2
  const now = series(baseline.model), after = series(next.model)
  const data = now.map((p, i) => ({ x: p.x, model: p.model, measured: after[i].model }))
  draw = profileChart(data, { range: [lo, hi], gap: dirty.length > 0, dims: false, label: "Профиль давления до и после правки" })
  redraw()
}

function fill(state) {
  const preset = PRESETS[state]
  for (const f of FIELDS) input(f.key).value = fmt(saved[f.key], f.digits)
  for (const [key, value] of Object.entries(preset)) {
    const f = FIELDS.find((x) => x.key === key)
    input(key).value = typeof value === "string" ? value : fmt(value, f.digits)
  }
  busy = state === "running"
  for (const f of FIELDS) input(f.key).disabled = busy
  if (busy) $("[data-apply]").setAttribute("aria-busy", "true")
  refresh()
}

function render(state) {
  $("[data-form]").innerHTML = FIELDS.map(field).join("")
  $("[data-fixed]").innerHTML = FIXED.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")
  for (const f of FIELDS) input(f.key).value = fmt(saved[f.key], f.digits)
  for (const root of document.querySelectorAll("[data-number]")) numberField(root)
  redraw = mount($("[data-chart]"), (w, h) => draw(w, h))
  $("[data-legend]").innerHTML = legend([["ch-model", "сейчас на участке"], ["ch-measured", "после правки"]])
  $("[data-form]").addEventListener("input", refresh)
  $("[data-form]").addEventListener("click", (e) => { if (e.target.closest(".step")) refresh() })
  $("[data-form]").addEventListener("focusout", refresh)
  $("[data-revert]").addEventListener("click", () => fill("clean"))
  $("[data-apply]").addEventListener("click", () => {
    busy = true
    $("[data-apply]").setAttribute("aria-busy", "true")
    refresh()
    setTimeout(() => {
      saved = { ...last }
      baseline = evaluate(saved)
      busy = false
      $("[data-apply]").removeAttribute("aria-busy")
      fill("clean")
    }, Number($("[data-apply]").dataset.ms))
  })
  fill(state)
}

shell({
  screen: "model",
  title: "Модель участка",
  states: [["clean", "Без правок"], ["edited", "Есть правка"], ["warning", "Предупреждение"], ["error", "Ошибка в поле"], ["running", "Применяется"]],
  parts: [
    ["Раскладка", "форма --sd-panel слева, превью 1fr справа; ниже 64rem превью уходит под форму"],
    ["Поля", "NumberField с шагом и единицей; под полем норма, а после правки строка «Было»"],
    ["Превью", "профиль давления: пунктир сейчас, сплошная после правки, штриховка разницы; таблица сравнения"],
    ["Расчёт", "тот же симулятор, что на участке: формула Альтшуля, вязкость по Шухову, утечка на 6 330 м"],
    ["Состояния", "Banner при малом запасе порога, ошибка поля блокирует применение, stale для превью"],
  ],
  line: () => "calm",
  onTheme: () => redraw(),
  render,
})
