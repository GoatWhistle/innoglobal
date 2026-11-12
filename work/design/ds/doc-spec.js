import { inTheme, make, raw, semanticNames, THEMES } from "./doc-read.js"

function tokens() {
  for (const host of document.querySelectorAll("[data-tokens]")) {
    for (const name of host.dataset.tokens.trim().split(/\s+/)) {
      const item = make("li", "", host)
      make("code", "", item, name)
      const value = raw(name)
      if (CSS.supports("color", value) && !/^\d/.test(value)) {
        const swatch = make("i", "token-swatch", item)
        swatch.style.background = `var(${name})`
        continue
      }
      make("span", "", item, value.replace(/(\d)\.(\d)/g, "$1,$2"))
    }
  }
}

function pairs() {
  const names = semanticNames()
  for (const host of document.querySelectorAll("[data-pair]")) {
    const template = host.querySelector("[data-view]")
    if (!template) continue
    for (const [theme, label] of THEMES) {
      const view = theme === "light" ? template : host.appendChild(template.cloneNode(true))
      view.dataset.view = theme
      view.style.colorScheme = theme
      for (const [name, value] of inTheme(theme, () => names.map((n) => [n, raw(n)])))
        view.style.setProperty(name, value)
      const tag = view.querySelector("[data-view-name]")
      if (tag) tag.textContent = label
    }
  }
}

tokens()
pairs()
