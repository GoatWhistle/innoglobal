const root = document.documentElement
const options = document.querySelectorAll("[data-theme-pick]")

function pick(theme) {
  root.dataset.theme = theme
  for (const option of options)
    option.setAttribute("aria-checked", String(option.dataset.themePick === theme))
  try {
    localStorage.setItem("ds-theme", theme)
  } catch {}
  document.dispatchEvent(new Event("theme:change"))
}

for (const option of options) option.addEventListener("click", () => pick(option.dataset.themePick))

let saved = null
try {
  saved = localStorage.getItem("ds-theme")
} catch {}
if (saved === "light" || saved === "dark") pick(saved)

document.querySelector("[data-reset]")?.addEventListener("click", () => {
  document.dispatchEvent(new Event("scene:reset"))
})
