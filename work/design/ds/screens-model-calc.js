import { buildModel, createSim, HOLD, MODEL, SEGMENT_M, THRESHOLD, WAVE_MS } from "./scene/sim.js"
import { seeded } from "./runtime/session.js"

export const LEAK_AT = 6330

export const FIELDS = [
  { key: "flow", label: "Расход", unit: "м³/ч", min: 600, max: 2400, step: 50, digits: 0, note: "Номинал перекачки участка" },
  { key: "pressure", label: "Давление на входе", unit: "МПа", min: 2, max: 7.4, step: 0.05, digits: 2, note: "После насосной станции" },
  { key: "inlet", label: "Температура нефти на входе", unit: "°C", min: 20, max: 70, step: 1, digits: 0, note: "Задаёт вязкость по длине" },
  { key: "wave", label: "Скорость волны давления", unit: "м/с", min: 900, max: 1400, step: 10, digits: 0, note: "Для нефти в стальной трубе 1 000–1 300 м/с" },
  { key: "threshold", label: "Порог расхождения", unit: "МПа", min: 0.01, max: 0.3, step: 0.01, digits: 2, note: "Ниже порога расхождение считается шумом" },
  { key: "hold", label: "Выдержка", unit: "с", min: 0.1, max: 2, step: 0.1, digits: 1, note: "Сколько расхождение держится до тревоги" },
]

export const FIXED = [
  ["Длина участка", `${fmt(SEGMENT_M, 0)} м`],
  ["Внутренний диаметр", `${fmt(MODEL.diameter * 1000, 0)} мм`],
  ["Шероховатость стенки", `${fmt(MODEL.roughness * 1000, 1)} мм`],
  ["Плотность нефти", `${fmt(MODEL.density, 0)} кг/м³`],
  ["Температура грунта", `${fmt(MODEL.ground, 0)} °C`],
  ["Датчики", "шесть, через 2 400 м"],
]

export const SAVED = { flow: MODEL.flow, pressure: MODEL.pressure, inlet: MODEL.inlet, wave: WAVE_MS, threshold: THRESHOLD, hold: HOLD }
export const NOISE = noise()

export function fmt(v, digits = 2) {
  return new Intl.NumberFormat("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v)
}

export function parse(text) {
  const value = Number(String(text).replace(/\s/g, "").replace(",", "."))
  return String(text).trim() === "" ? Number.NaN : value
}

export function check(values) {
  const errors = {}
  for (const f of FIELDS) {
    const v = values[f.key]
    if (!Number.isFinite(v)) errors[f.key] = "Введите число"
    else if (v < f.min || v > f.max) errors[f.key] = `Допустимо от ${fmt(f.min, f.digits)} до ${fmt(f.max, f.digits)} ${f.unit}`
  }
  return errors
}

export function evaluate(values) {
  const params = { ...MODEL, flow: values.flow, pressure: values.pressure, inlet: values.inlet }
  const model = buildModel(params)
  const sim = createSim(seeded(42), { wave: values.wave, threshold: values.threshold, hold: values.hold, params })
  sim.advance(2)
  sim.insert(LEAK_AT)
  for (let i = 0; i < 1500 && !sim.detection; i++) sim.advance(0.01)
  const outlet = model[model.length - 1]
  return {
    model, outlet, drop: values.pressure - outlet,
    detection: sim.detection, margin: values.threshold / NOISE,
    negative: outlet <= 0,
  }
}

export function series(model) {
  return Array.from({ length: 121 }, (_, i) => {
    const f = i / 120 * (model.length - 1)
    const j = Math.min(Math.floor(f), model.length - 2)
    const v = model[j] + (model[j + 1] - model[j]) * (f - j)
    return { x: i / 120 * SEGMENT_M, model: v, measured: v }
  })
}

function noise() {
  const sim = createSim(seeded(42))
  let max = 0
  for (let i = 0; i < 3000; i++) {
    sim.advance(0.01)
    for (const s of sim.sensors) max = Math.max(max, Math.abs(s.residual))
  }
  return max
}
