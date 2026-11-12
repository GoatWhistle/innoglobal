import { legend, mount, profileChart } from "./screens-chart.js"
import { DETECT_S, FOUND_X, fmt, profile, residualAt, SENSORS, sensorState, SPREAD } from "./screens-data.js"
import { shell } from "./screens-shell.js"
import { sceneShot } from "./screens-shot.js"
import { schemaFallback, sensorRows, statusBlock, TIME } from "./screens-twin-panel.js"

const $ = (s) => document.querySelector(s)

const STATES = [
  ["calm", "Норма"],
  ["watch", "Наблюдение"],
  ["leak", "Утечка найдена"],
  ["ack", "Принята оператором"],
  ["nogl", "Нет WebGL"],
  ["offline", "Нет связи"],
]

const PARTS = [
  ["Каркас", "app-bar: марка, навигация, живой статус, тема; ниже 48rem навигация внизу"],
  ["Сцена", "twin-stage: сцена WebGL на всю рабочую область, фон --sd-stage"],
  ["Панель", "twin-panel --sd-panel 400px (440px от 120rem), ниже 75rem уходит под сцену в две колонки"],
  ["Статус", "StatusBadge, Stat (readout), Button primary и danger, Dialog"],
  ["Датчики", "список с ResidualMeter: замер, модель, невязка и порог 0,07 МПа"],
  ["Профиль", "SVG-график: модель тонкой линией, замер толстой, невязка штриховкой"],
  ["Без WebGL", "Banner и 2D-схема из kit-error, тревоги работают"],
  ["Отступы", "--sd-gutter 24/32px, --space-24 внутри панелей, --header-height"],
]

let draw = null

function render(state) {
  const t = TIME[state]
  const detected = t !== null && t >= DETECT_S
  const scene = state === "calm" || state === "offline" ? "calm" : state === "watch" ? "watch" : "leak"
  const nogl = state === "nogl"
  $("[data-scene]").hidden = nogl
  $("[data-nogl]").hidden = !nogl
  if (nogl) $("[data-nogl]").innerHTML = schemaFallback()
  else sceneShot($("[data-scene]"), scene)
  $("[data-hint]").hidden = scene !== "calm"
  const status = $("[data-status]")
  status.dataset.tone = detected ? "danger" : t !== null ? "warning" : ""
  status.setAttribute("role", detected && state !== "ack" ? "alert" : "status")
  status.innerHTML = statusBlock(state)
  $("[data-sensors]").innerHTML = sensorRows(state)
  $("[data-legend]").innerHTML = legend([
    ["ch-model", "модель"],
    ["ch-measured", "замер"],
    ...(t === null ? [] : [["ch-hatch-key", "невязка"]]),
  ])
  const states = [0, 1, 2, 3, 4, 5].map((i) => (t === null ? "calm" : sensorState(i, t, detected)))
  draw = profileChart(profile(t), {
    states,
    gap: t !== null,
    leak: detected ? { x: FOUND_X, spread: SPREAD } : null,
    note:
      t !== null && !detected
        ? (x, y) => [x(7200), y(SENSORS[3].model - residualAt(3, t)), `Д-04: ${fmt(residualAt(3, t))} МПа ниже модели`]
        : null,
  })
  mount($("[data-profile]"), draw)
}

shell({
  screen: "twin",
  title: "Участок: цифровой двойник",
  states: STATES,
  parts: PARTS,
  line: (s) => (s === "calm" ? "calm" : s === "offline" ? "calm" : s === "watch" ? "watch" : "leak"),
  shellOf: (s) => (s === "offline" ? "offline" : undefined),
  render,
})
