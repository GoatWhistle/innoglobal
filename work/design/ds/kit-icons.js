const DOMAIN = new Set([
  "pipe",
  "flow",
  "flow-start",
  "flow-stop",
  "leak",
  "leak-insert",
  "pressure",
  "temperature",
  "sensor",
  "sensor-off",
  "valve",
  "pump",
  "diverge",
  "alarm",
])

const SIZES = [16, 18, 24]

const cell = (id) =>
  `<div class="glyph"><div class="glyph-sizes">${SIZES.map(
    (s) => `<svg class="icon icon-${s}" aria-hidden="true"><use href="icons.svg#${id}"/></svg>`,
  ).join("")}</div><code>${id}</code></div>`

export async function iconSheet(host) {
  if (!host) return
  const text = await (await fetch("icons.svg")).text()
  const ids = [...text.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1])
  const domain = ids.filter((id) => DOMAIN.has(id))
  const ui = ids.filter((id) => !DOMAIN.has(id))
  host.innerHTML = `<h3 class="kit-sub">Предметные, ${domain.length}</h3><div class="glyphs">${domain.map(cell).join("")}</div><h3 class="kit-sub">Интерфейсные, ${ui.length}</h3><div class="glyphs">${ui.map(cell).join("")}</div>`
}
