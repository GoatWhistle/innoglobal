const stage = document.querySelector("[data-ditto-stage]")
const mark = stage?.querySelector(".ditto")
const caption = stage?.querySelector("[data-ditto-caption]")
const picks = [...document.querySelectorAll("[data-ditto-pick]")]
const reduce = document.querySelector("[data-ditto-reduce]")
const system = matchMedia("(prefers-reduced-motion: reduce)")

const LABELS = {
  reveal: "Появление",
  calm: "Норма: двойник совпадает",
  alarm: "Тревога: расхождение найдено",
  busy: "Расчёт: ищем место",
}

function play(state) {
  if (!mark) return
  mark.removeAttribute("data-ditto")
  mark.getBoundingClientRect()
  mark.dataset.ditto = state
  const still = system.matches || reduce?.getAttribute("aria-pressed") === "true"
  const text = still ? `${LABELS[state]}. Знак без движения` : LABELS[state]
  caption.textContent = text
  mark.setAttribute("aria-label", `Знак в состоянии «${LABELS[state]}»`)
  for (const pick of picks) pick.setAttribute("aria-checked", String(pick.dataset.dittoPick === state))
}

function current() {
  return picks.find((pick) => pick.getAttribute("aria-checked") === "true")?.dataset.dittoPick ?? "reveal"
}

for (const pick of picks) pick.addEventListener("click", () => play(pick.dataset.dittoPick))

document.querySelector("[data-ditto-replay]")?.addEventListener("click", () => play(current()))

reduce?.addEventListener("click", () => {
  const on = reduce.getAttribute("aria-pressed") !== "true"
  reduce.setAttribute("aria-pressed", String(on))
  mark?.toggleAttribute("data-reduced", on)
  play(current())
})

if (system.matches) reduce?.setAttribute("aria-pressed", "true")
play("reveal")
