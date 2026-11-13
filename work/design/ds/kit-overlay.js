import { ms } from "./kit-controls.js"
import { icon } from "./kit-layer.js"

const LIMIT = 3

export function tooltips() {
  const tip = document.createElement("div")
  tip.className = "tooltip"
  tip.setAttribute("role", "tooltip")
  tip.id = "kit-tooltip"
  tip.hidden = true
  document.body.append(tip)
  let timer = 0
  let lastHide = -Infinity
  let owner = null
  const show = (el, now) => {
    owner = el
    const kbd = el.dataset.kbd ? `<span class="kbd">${el.dataset.kbd}</span>` : ""
    tip.innerHTML = `<span>${el.dataset.tip}</span>${kbd}`
    tip.toggleAttribute("data-instant", now)
    tip.hidden = false
    const r = el.getBoundingClientRect()
    const t = tip.getBoundingClientRect()
    const top = r.top - t.height - 8 > 8
    const x = Math.max(8, Math.min(r.left + r.width / 2 - t.width / 2, innerWidth - t.width - 8))
    const y = top ? r.top - t.height - 8 : r.bottom + 8
    tip.style.setProperty("--x", `${x}px`)
    tip.style.setProperty("--y", `${y}px`)
    tip.style.setProperty("--origin", `${r.left + r.width / 2 - x}px ${top ? "100%" : "0"}`)
    tip.dataset.side = top ? "top" : "bottom"
    el.setAttribute("aria-describedby", tip.id)
  }
  const hide = () => {
    clearTimeout(timer)
    if (!tip.hidden) lastHide = performance.now()
    tip.hidden = true
    owner?.removeAttribute("aria-describedby")
    owner = null
  }
  const enter = (el) => {
    clearTimeout(timer)
    if (performance.now() - lastHide < ms("--window-tooltip-skip") || !tip.hidden) show(el, true)
    else timer = setTimeout(() => show(el, false), ms("--delay-tooltip"))
  }
  for (const el of document.querySelectorAll("[data-tip]")) {
    el.addEventListener("pointerenter", () => enter(el))
    el.addEventListener("pointerleave", hide)
    el.addEventListener("focus", () => el.matches(":focus-visible") && show(el, true))
    el.addEventListener("blur", hide)
    el.addEventListener("pointerdown", hide)
  }
  addEventListener("keydown", (e) => e.key === "Escape" && hide())
  addEventListener("scroll", hide, true)
  addEventListener("pointerdown", hide, true)
}

export const TOASTS = {
  valve: {
    tone: "danger",
    icon: "error",
    title: "Задвижка З-2 не ответила",
    text: "Команда «перекрыть» не подтверждена за 10 с. Участок открыт.",
    action: "Повторить",
  },
  watch: {
    tone: "warning",
    icon: "warning",
    title: "Расхождение на Д-06 растёт",
    text: "0,05 МПа при пороге 0,07. Тревога включится, если 0,07 МПа продержится 0,4 с ещё на одном датчике.",
  },
  done: { icon: "check", title: "Участок перекрыт", text: "Задвижка З-2 закрыта, давление выравнивается." },
  info: { icon: "info", title: "Модель пересчитана для мазута", text: "Вязкость выше, перепад давления вырос на 18 %." },
}

export function toast(kind) {
  const host = document.querySelector("[data-toasts]")
  const t = TOASTS[kind]
  const node = document.createElement("div")
  node.className = "toast"
  if (t.tone) node.dataset.tone = t.tone
  node.setAttribute("role", t.tone === "danger" ? "alert" : "status")
  const action = t.action
    ? `<div class="toast-actions"><button class="button button-danger button-sm">${icon("refresh")}<span>${t.action}</span></button></div>`
    : ""
  node.innerHTML = `${icon(t.icon)}<p class="toast-text"><b>${t.title}</b><span>${t.text}</span></p><button class="icon-button icon-button-sm close-button" aria-label="Закрыть уведомление">${icon("x")}</button>${action}<span class="toast-timer" aria-hidden="true"></span>`
  host.append(node)
  const live = [...host.querySelectorAll(".toast:not([data-leaving])")]
  if (live.length > LIMIT) leave(live[0])
  node.querySelector(".toast-timer").addEventListener("animationend", () => leave(node))
  node.querySelector(".close-button").addEventListener("click", () => leave(node))
}

function leave(node) {
  if (node.hasAttribute("data-leaving")) return
  node.dataset.leaving = ""
  node.addEventListener("animationend", (e) => e.target === node && node.remove())
}

export function dialogs() {
  for (const b of document.querySelectorAll("[data-dialog]")) {
    const dialog = document.getElementById(b.dataset.dialog)
    b.addEventListener("click", () => {
      dialog.showModal()
      dialog.querySelector(".dialog-title")?.focus()
    })
  }
  for (const dialog of document.querySelectorAll("dialog")) {
    dialog.addEventListener("click", (e) => e.target === dialog && dialog.close())
    for (const c of dialog.querySelectorAll("[data-close]")) c.addEventListener("click", () => dialog.close())
  }
}
