export const ms = (name) =>
  Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0

const nf = (digits) => new Intl.NumberFormat("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits })

export function segmented(root) {
  const buttons = [...root.querySelectorAll('[role="radio"]')]
  const enabled = buttons.filter((b) => b.getAttribute("aria-disabled") !== "true")
  const ink = document.createElement("span")
  ink.className = "segmented-ink"
  ink.setAttribute("aria-hidden", "true")
  root.prepend(ink)
  root.style.setProperty("--count", buttons.length)
  const pick = (b, focus) => {
    for (const x of buttons) {
      x.setAttribute("aria-checked", String(x === b))
      x.tabIndex = x === b ? 0 : -1
    }
    root.style.setProperty("--index", buttons.indexOf(b))
    if (focus) b.focus()
    root.dispatchEvent(new CustomEvent("change", { detail: b.dataset.value }))
  }
  for (const b of enabled) b.addEventListener("click", () => pick(b))
  root.addEventListener("keydown", (e) => {
    const i = enabled.indexOf(document.activeElement)
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (step === undefined || i < 0) return
    e.preventDefault()
    pick(enabled[(i + step + enabled.length) % enabled.length], true)
  })
  pick(buttons.find((b) => b.getAttribute("aria-checked") === "true") ?? enabled[0])
}

export function tabs(root) {
  const list = root.querySelector('[role="tablist"]')
  const all = [...list.querySelectorAll('[role="tab"]')]
  const enabled = all.filter((t) => t.getAttribute("aria-disabled") !== "true")
  const ink = list.querySelector(".tabs-ink")
  const panel = root.querySelector('[role="tabpanel"]')
  const place = (t) => {
    ink.style.setProperty("--x", `${t.offsetLeft}px`)
    ink.style.setProperty("--w", t.offsetWidth)
  }
  const pick = (t, focus) => {
    for (const x of all) {
      x.setAttribute("aria-selected", String(x === t))
      x.tabIndex = x === t ? 0 : -1
    }
    place(t)
    if (panel) panel.textContent = t.dataset.panel ?? ""
    if (focus) t.focus()
  }
  for (const t of enabled) t.addEventListener("click", () => pick(t))
  list.addEventListener("keydown", (e) => {
    const i = enabled.indexOf(document.activeElement)
    const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: enabled.length - 1 }
    if (!(e.key in map) || i < 0) return
    e.preventDefault()
    pick(enabled[(map[e.key] + enabled.length) % enabled.length], true)
  })
  const first = all.find((t) => t.getAttribute("aria-selected") === "true") ?? enabled[0]
  document.fonts.ready.then(() => pick(first))
  new ResizeObserver(() => place(all.find((t) => t.ariaSelected === "true"))).observe(list)
}

export function slider(root) {
  const inputs = [...root.querySelectorAll("input")]
  const out = root.querySelector("[data-out]")
  const digits = Number(root.dataset.digits ?? 0)
  const sync = () => {
    const ks = inputs.map((i) => (i.value - i.min) / (i.max - i.min))
    const [a, b] = ks.length === 2 ? [Math.min(...ks), Math.max(...ks)] : [0, ks[0]]
    root.style.setProperty("--a", a)
    root.style.setProperty("--b", b)
    const values = inputs.map((i) => Number(i.value)).sort((x, y) => x - y)
    out.textContent = values.map((v) => nf(digits).format(v)).join("–")
  }
  for (const i of inputs) i.addEventListener("input", sync)
  sync()
}

export function numberField(root) {
  const input = root.querySelector("input")
  const [down, up] = root.querySelectorAll(".step")
  const { min, max, step, digits } = Object.fromEntries(
    Object.entries(root.dataset).map(([k, v]) => [k, Number(v)]),
  )
  const read = () => Number.parseFloat(input.value.replace(/\s/g, "").replace(",", ".")) || 0
  const write = (v) => {
    const k = 10 ** digits
    const clamped = Math.min(max, Math.max(min, Math.round(v * k) / k))
    input.value = nf(digits).format(clamped)
    down.disabled = input.disabled || clamped <= min
    up.disabled = input.disabled || clamped >= max
  }
  down.addEventListener("click", () => write(read() - step))
  up.addEventListener("click", () => write(read() + step))
  input.addEventListener("keydown", (e) => {
    const k = { ArrowUp: 1, ArrowDown: -1 }[e.key]
    if (!k) return
    e.preventDefault()
    write(read() + k * step * (e.shiftKey ? 10 : 1))
  })
  input.addEventListener("blur", () => write(read()))
  write(read())
}

export function searchField(root) {
  const input = root.querySelector("input")
  const clear = root.querySelector(".close-button")
  const sync = () => root.toggleAttribute("data-empty", !input.value)
  input.addEventListener("input", sync)
  clear.addEventListener("click", () => {
    input.value = ""
    sync()
    input.focus()
  })
  addEventListener("keydown", (e) => {
    if (e.key === "/" && !e.target.closest("input, textarea")) {
      e.preventDefault()
      input.focus()
    }
  })
  sync()
}

export function disclosure(root) {
  const trigger = root.querySelector(".disclosure-trigger")
  trigger.addEventListener("click", () => {
    const open = !root.hasAttribute("data-open")
    root.toggleAttribute("data-open", open)
    trigger.setAttribute("aria-expanded", String(open))
  })
}

export function copyButton(button) {
  let timer = 0
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy)
    } catch {
      button.dataset.tip = "Не удалось скопировать"
      button.setAttribute("aria-label", "Не удалось скопировать. Повторить")
      return
    }
    button.dataset.copied = ""
    button.dataset.tip = "Скопировано"
    button.setAttribute("aria-label", "Скопировано")
    clearTimeout(timer)
    timer = setTimeout(() => {
      delete button.dataset.copied
      button.dataset.tip = "Скопировать"
      button.setAttribute("aria-label", button.dataset.label)
    }, 1600)
  })
}

export function scrollArea(el) {
  const sync = () => {
    el.toggleAttribute("data-at-top", el.scrollTop <= 1)
    el.toggleAttribute("data-at-bottom", el.scrollTop + el.clientHeight >= el.scrollHeight - 1)
    el.toggleAttribute("data-at-left", el.scrollLeft <= 1)
    el.toggleAttribute("data-at-right", el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
  }
  el.addEventListener("scroll", sync, { passive: true })
  new ResizeObserver(sync).observe(el)
  sync()
}

export function busyButton(button) {
  const iconEl = button.querySelector(".icon")
  button.addEventListener("click", () => {
    if (button.getAttribute("aria-busy") === "true") return
    button.setAttribute("aria-busy", "true")
    const spinner = document.createElement("span")
    spinner.className = "spinner spinner-md"
    spinner.setAttribute("aria-hidden", "true")
    const spinTimer = setTimeout(() => iconEl.replaceWith(spinner), ms("--delay-spinner"))
    setTimeout(() => {
      clearTimeout(spinTimer)
      spinner.replaceWith(iconEl)
      button.removeAttribute("aria-busy")
    }, Number(button.dataset.ms))
  })
}
