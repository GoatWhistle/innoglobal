const GAP = 4
const EDGE = 8

export const icon = (id, cls = "icon") =>
  `<svg class="${cls}" aria-hidden="true"><use href="icons.svg#${id}"/></svg>`

export function place(layer, anchor, align = "start") {
  const a = anchor.getBoundingClientRect()
  const w = layer.offsetWidth
  const h = layer.offsetHeight
  const below = innerHeight - a.bottom
  const side = below < h + GAP + EDGE && a.top > below ? "top" : "bottom"
  const raw = align === "end" ? a.right - w : a.left
  const x = Math.max(EDGE, Math.min(raw, innerWidth - w - EDGE))
  const rawY = side === "bottom" ? a.bottom + GAP : a.top - GAP - h
  const y = Math.max(EDGE, Math.min(rawY, innerHeight - h - EDGE))
  layer.dataset.side = side
  layer.style.insetInlineStart = `${x}px`
  layer.style.insetBlockStart = `${y}px`
  const ox = Math.max(0, Math.min(w, a.left + a.width / 2 - x))
  layer.style.setProperty("--origin", `${ox}px ${side === "bottom" ? "0" : "100%"}`)
}

export function control(trigger, layer, options = {}) {
  const isOpen = () => layer.matches(":popover-open")
  const sync = () => isOpen() && place(layer, trigger, options.align)
  const open = () => {
    if (isOpen()) return
    if (options.matchWidth) layer.style.minInlineSize = `${trigger.offsetWidth}px`
    layer.showPopover()
    place(layer, trigger, options.align)
    trigger.setAttribute("aria-expanded", "true")
    options.onOpen?.()
  }
  const close = (refocus) => {
    if (!isOpen()) return
    layer.hidePopover()
    trigger.setAttribute("aria-expanded", "false")
    if (refocus) trigger.focus({ preventScroll: true })
    options.onClose?.()
  }
  document.addEventListener("pointerdown", (e) => {
    if (isOpen() && !layer.contains(e.target) && !trigger.contains(e.target)) close(false)
  })
  layer.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault()
      close(true)
    } else if (e.key === "Tab" && !options.keepOnTab) close(false)
  })
  addEventListener("resize", sync)
  addEventListener("scroll", sync, true)
  return { open, close, isOpen, toggle: () => (isOpen() ? close(false) : open()) }
}

export function roving(items, current, key) {
  const last = items.length - 1
  const moves = {
    ArrowDown: current < last ? current + 1 : 0,
    ArrowUp: current > 0 ? current - 1 : last,
    Home: 0,
    End: last,
  }
  return key in moves ? moves[key] : null
}

function typeahead() {
  let query = ""
  let timer = 0
  return (key, items, label) => {
    clearTimeout(timer)
    timer = setTimeout(() => (query = ""), 500)
    query += key.toLowerCase()
    return items.findIndex((item) => label(item).toLowerCase().startsWith(query))
  }
}

export function selectBox(root) {
  const trigger = root.querySelector(".select-trigger")
  const list = root.querySelector('[role="listbox"]')
  const value = root.querySelector(".select-value")
  const options = [...list.querySelectorAll('[role="option"]')]
  const enabled = options.filter((o) => o.getAttribute("aria-disabled") !== "true")
  const seek = typeahead()
  const label = (o) => o.querySelector(".option-label").textContent
  let active = -1
  options.forEach((o, i) => {
    o.id ||= `${list.id}-o${i}`
    o.insertAdjacentHTML("afterbegin", icon("check", "icon option-check"))
  })
  const mark = (i) => {
    for (const o of options) o.removeAttribute("data-active")
    active = i
    const o = enabled[i]
    if (!o) return
    o.setAttribute("data-active", "")
    list.setAttribute("aria-activedescendant", o.id)
    o.scrollIntoView({ block: "nearest" })
  }
  const ui = control(trigger, list, {
    matchWidth: true,
    onOpen: () => {
      mark(Math.max(0, enabled.findIndex((o) => o.getAttribute("aria-selected") === "true")))
      list.focus({ preventScroll: true })
    },
  })
  const choose = (o) => {
    for (const x of options) x.setAttribute("aria-selected", String(x === o))
    value.textContent = label(o)
    value.removeAttribute("data-placeholder")
    ui.close(true)
  }
  trigger.addEventListener("click", ui.toggle)
  trigger.addEventListener("keydown", (e) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault()
      ui.open()
    }
  })
  list.addEventListener("keydown", (e) => {
    const next = roving(enabled, active, e.key)
    if (next !== null) {
      e.preventDefault()
      mark(next)
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      if (enabled[active]) choose(enabled[active])
    } else if (e.key.length === 1) {
      const hit = seek(e.key, enabled, label)
      if (hit >= 0) mark(hit)
    }
  })
  for (const o of enabled) {
    o.addEventListener("click", () => choose(o))
    o.addEventListener("pointermove", () => active !== enabled.indexOf(o) && mark(enabled.indexOf(o)))
  }
}

export function menu(trigger) {
  const layer = document.getElementById(trigger.getAttribute("aria-controls"))
  const items = [...layer.querySelectorAll('[role^="menuitem"]')]
  const enabled = items.filter((i) => i.getAttribute("aria-disabled") !== "true")
  const seek = typeahead()
  const label = (i) => i.querySelector(".option-label").textContent
  let active = -1
  const mark = (i) => {
    for (const x of items) x.removeAttribute("data-active")
    active = i
    enabled[i]?.setAttribute("data-active", "")
    enabled[i]?.focus({ preventScroll: true })
  }
  const ui = control(trigger, layer, { align: trigger.dataset.align, onOpen: () => mark(0) })
  trigger.addEventListener("click", ui.toggle)
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      ui.open()
      mark(e.key === "ArrowUp" ? enabled.length - 1 : 0)
    }
  })
  layer.addEventListener("keydown", (e) => {
    const next = roving(enabled, active, e.key)
    if (next !== null) {
      e.preventDefault()
      mark(next)
    } else if (e.key.length === 1 && e.key !== " ") {
      const hit = seek(e.key, enabled, label)
      if (hit >= 0) mark(hit)
    }
  })
  for (const item of items) {
    item.addEventListener("pointermove", () => {
      const i = enabled.indexOf(item)
      if (i >= 0 && i !== active) mark(i)
    })
    item.addEventListener("click", () => {
      if (item.getAttribute("aria-disabled") === "true") return
      if (item.getAttribute("role") === "menuitemcheckbox") {
        item.setAttribute("aria-checked", String(item.getAttribute("aria-checked") !== "true"))
        return
      }
      ui.close(true)
    })
  }
}

export function popover(trigger) {
  const layer = document.getElementById(trigger.getAttribute("aria-controls"))
  const ui = control(trigger, layer, {
    align: trigger.dataset.align,
    keepOnTab: true,
    onOpen: () => layer.querySelector("[data-autofocus]")?.focus({ preventScroll: true }),
  })
  trigger.addEventListener("click", ui.toggle)
  for (const b of layer.querySelectorAll("[data-close]")) b.addEventListener("click", () => ui.close(true))
  return ui
}
