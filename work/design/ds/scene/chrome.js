const root = document.documentElement
const toggle = document.querySelector("[data-theme-toggle]")

function current() {
  return root.dataset.theme === "light" ? "light" : "dark"
}

function render() {
  const next = current() === "dark" ? "light" : "dark"
  toggle?.setAttribute("aria-label", next === "light" ? "Светлая тема" : "Тёмная тема")
  toggle?.querySelector("use")?.setAttribute("href", `icons.svg#${next === "light" ? "sun" : "moon"}`)
}

toggle?.addEventListener("click", () => {
  const next = current() === "dark" ? "light" : "dark"
  root.dataset.theme = next
  try {
    localStorage.setItem("ds-theme", next)
  } catch {}
  render()
  document.dispatchEvent(new CustomEvent("theme:change"))
})

render()
