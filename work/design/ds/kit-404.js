import { segmented } from "./kit-controls.js"
import { tooltips } from "./kit-overlay.js"
import { themeSwitch } from "./kit-theme.js"

const path = new URLSearchParams(location.search).get("path")
const out = document.querySelector("[data-path]")
if (path) out.textContent = path
else if (!location.pathname.endsWith("404.html")) out.textContent = location.pathname

const sw = document.querySelector("[data-theme-switch]")
themeSwitch(sw)
segmented(sw)
tooltips()

addEventListener("storage", (e) => {
  if (e.key === "ds-theme" && e.newValue) document.documentElement.dataset.theme = e.newValue
})
