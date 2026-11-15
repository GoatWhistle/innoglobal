const KEY = "ds-theme"

export function readTheme() {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark"
  } catch {
    return "dark"
  }
}

export function themeSwitch(root) {
  root.addEventListener("change", (e) => {
    document.documentElement.dataset.theme = e.detail
    try {
      localStorage.setItem(KEY, e.detail)
    } catch {}
  })
  const current = readTheme()
  for (const b of root.querySelectorAll('[role="radio"]'))
    b.setAttribute("aria-checked", String(b.dataset.value === current))
}
