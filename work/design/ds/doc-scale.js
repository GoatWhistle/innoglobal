import { make, num, px, raw } from "./doc-read.js"

const SCALE = [
  ["display", "light", "display", "Нефть течёт"],
  ["heading-lg", "light", "display", "Участок 1 240–1 380 м"],
  ["heading", "light", "tight", "Журнал событий датчиков"],
  ["subheading", "regular", "normal", "Давление ниже модели на 0,37 бар"],
  ["lead", "light", "normal", "Модель сравнивает расчётное давление с замеренным."],
  ["body", "regular", "normal", "Шероховатость стенки и вязкость задаются в параметрах участка."],
  ["body-sm", "regular", "normal", "Порог 0,06 бар, удержание 0,45 с, минимум два датчика."],
  ["label", "medium", "normal", "Диаметр трубы, мм"],
  ["caption", "regular", "normal", "Обновлено 4 с назад"],
  ["micro", "regular", "wide", "Д-03"],
  ["readout", "light", "tight", "4,29"],
  ["readout-sm", "regular", "normal", "1 245,8"],
]
const FIGURES = [1245.8, 87.3, 12004, 0.4, 311.1]
const SPACES = [2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96, 152]
const MEASURES = [
  ["--hairline", "Линия"],
  ["--control-height", "Высота поля и кнопки"],
  ["--control-height-compact", "Компактная высота"],
  ["--target-min", "Цель касания"],
  ["--header-height", "Шапка"],
  ["--field-max-width", "Ширина одного поля"],
]
const LAYERS = [
  ["--layer-skip-link", "Ссылка «к содержанию»"],
  ["--layer-tooltip", "Подсказка"],
  ["--layer-toast", "Уведомление"],
  ["--layer-dialog", "Диалог"],
  ["--layer-popover", "Список, меню"],
  ["--layer-sticky", "Липкая шапка"],
  ["--layer-raised", "Поднятая панель"],
]
const SIZES = [
  ["--icon-sm", "В тексте"],
  ["--icon-control", "В кнопке"],
  ["--icon-md", "Навигация"],
  ["--icon-lg", "Панель"],
  ["--icon-xl", "Пустое состояние"],
]
const GLYPHS = [
  "pipe",
  "flow",
  "pressure",
  "temperature",
  "sensor",
  "valve",
  "pump",
  "leak",
  "alarm",
  "warning",
  "timer",
  "journal",
]

function fluid(value, factor = 1) {
  const match = /clamp\(\s*([\d.]+)rem,.*?,\s*([\d.]+)rem\s*\)/.exec(value)
  return match ? `${num(match[1] * 16 * factor)}–${num(match[2] * 16 * factor)}` : null
}

function scale() {
  const host = document.querySelector("[data-scale]")
  if (!host) return
  for (const [name, weight, tracking, text] of SCALE) {
    const row = make("tr", "", host)
    const sample = make("p", "scale-sample", make("td", "", row), text)
    sample.style.fontSize = `var(--font-size-${name})`
    sample.style.lineHeight = `var(--line-height-${name})`
    sample.style.fontWeight = `var(--weight-${weight})`
    sample.style.letterSpacing = `var(--tracking-${tracking})`
    if (name.startsWith("readout")) sample.style.fontVariantNumeric = "var(--font-numeric)"
    make("td", "scale-token", row, name)
    const size = fluid(raw(`--font-size-${name}`)) ?? num(px(`--font-size-${name}`, "font-size"))
    make("td", "num", row, size)
    const line = Number(raw(`--line-height-${name}`))
    const box = Number.parseFloat(getComputedStyle(sample).fontSize) * line
    make("td", "num", row, fluid(raw(`--font-size-${name}`), line) ?? num(box))
    make("td", "num", row, raw(`--weight-${weight}`))
  }
}

function figures() {
  const host = document.querySelector("[data-figures]")
  if (!host) return
  for (const value of FIGURES) make("span", "", host, num(value, 1))
}

function spaces() {
  const host = document.querySelector("[data-spaces]")
  if (!host) return
  for (const step of SPACES) {
    const row = make("div", "space", host)
    make("span", "space-token", row, `--space-${step}`)
    make("span", "space-value", row, num(px(`--space-${step}`)))
    make("i", "space-bar", row).style.inlineSize = `var(--space-${step})`
  }
}

function measures() {
  const host = document.querySelector("[data-measures]")
  if (!host) return
  for (const [name, label] of MEASURES) {
    const item = make("div", "measure", host)
    make("dt", "", item, label)
    const value = make("dd", "", item, `${num(px(name))} px`)
    make("code", "", value, name)
  }
}

function ladder() {
  const host = document.querySelector("[data-ladder]")
  if (!host) return
  for (const [name, label] of LAYERS) {
    const item = make("li", "", host)
    make("span", "ladder-value", item, raw(name))
    make("span", "", item, label)
  }
}

function icons() {
  const host = document.querySelector("[data-icon-sizes]")
  if (!host) return
  const sizes = make("div", "icon-ladder", host)
  for (const [name, label] of SIZES) {
    const cell = make("figure", "icon-size", sizes)
    cell.innerHTML = `<svg class="icon" aria-hidden="true"><use href="icons.svg#pressure"/></svg>`
    cell.firstElementChild.style.inlineSize = `var(${name})`
    cell.firstElementChild.style.blockSize = `var(${name})`
    const caption = make("figcaption", "", cell, label)
    make("b", "", caption, num(px(name)))
  }
  const strip = make("div", "icon-strip", host)
  for (const id of GLYPHS)
    strip.insertAdjacentHTML(
      "beforeend",
      `<svg class="icon" aria-hidden="true"><use href="icons.svg#${id}"/></svg>`,
    )
}

scale()
figures()
spaces()
measures()
ladder()
icons()
