const root = document.documentElement
const KEY = "ds-directions"
const COUNT = 1200
const PICK = 630
const DIRS = [
  { id: "instrument", name: "Прибор", note: "Физические клавиши, точечные цифры, светодиодная шкала. Пульт, а не сайт." },
  { id: "drawing", name: "Чертёж", note: "Сетка, рамки, размерные линии, моноширинные подписи. Инженерный лист." },
  { id: "glass", name: "Жидкое стекло", note: "Панели-линзы преломляют данные под собой. Глубина вместо линий." },
  { id: "editorial", name: "Редакция", note: "Цифры размером с заголовок, асимметричная сетка, появление при прокрутке." },
]

const gauss = (i, c, w) => Math.exp(-((i - c) ** 2) / (2 * w * w))
const base = (i) => 7.55 + (1 - gauss(i, PICK, 16)) * (0.22 * Math.sin(i * 0.051) + 0.14 * Math.sin(i * 0.213 + 1.3) + 0.06 * Math.sin(i * 0.97))
const PITS = [[180, 0.7, 0.9, 14], [412, 0.5, 0.75, 22], [905, 0.9, 1.0, 11], [1081, 0.4, 0.62, 18]]
const depthV = base(PICK) - 6.43
const depthF = 6.43 - 0.45 - 4.86

const vtd = []
const fc = []
const spread = []
for (let i = 0; i < COUNT; i++) {
  let v = base(i) - depthV * gauss(i, PICK, 9)
  let f = v - 0.45 - depthF * gauss(i, PICK, 9)
  let k = gauss(i, PICK, 9)
  for (const [c, dv, df, w] of PITS) { const g = gauss(i, c, w); v -= dv * g; f -= (dv + df) * g; k = Math.max(k, g) }
  vtd.push(v)
  fc.push(f)
  spread.push(0.18 + 0.16 * k)
}

const fmt = (n, d = 2) => n.toFixed(d).replace(".", ",").replace("-", "−")
const metres = (i) => (i * 10).toLocaleString("ru-RU").replace(/ /g, " ")

function chart() {
  const svg = document.querySelector("[data-chart]")
  const W = Math.round((svg.clientWidth / svg.clientHeight) * 220) || 1000
  svg.setAttribute("viewBox", `0 0 ${W} 220`)
  const x = (i) => (i / (COUNT - 1)) * W
  const y = (mm) => 200 - ((mm - 3.6) / (8.4 - 3.6)) * 180
  const line = (arr) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("")
  const upper = fc.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v + spread[i]).toFixed(1)}`).join("")
  const lower = fc.map((_, j) => COUNT - 1 - j).map((i) => `L${x(i).toFixed(1)} ${y(fc[i] - spread[i]).toFixed(1)}`).join("")
  const grid = [4, 5, 6, 7, 8].map((mm) => `<line class="c-grid" x1="0" x2="${W}" y1="${y(mm)}" y2="${y(mm)}"/><text class="c-tick" x="4" y="${y(mm) - 4}">${mm}</text>`).join("")
  svg.innerHTML = `${grid}<path class="c-band" d="${upper}${lower}Z"/><path class="c-vtd" d="${line(vtd)}"/><path class="c-fc" d="${line(fc)}"/>
    <g class="c-pick" style="--x:${x(PICK)}px"><line x1="${x(PICK)}" x2="${x(PICK)}" y1="8" y2="212"/><circle cx="${x(PICK)}" cy="${y(fc[PICK])}" r="5"/></g>`
}

function strip() {
  const el = document.querySelector("[data-strip]")
  const sorted = [...fc].sort((a, b) => a - b)
  const cut = sorted[Math.floor(COUNT * 0.1)]
  const cells = []
  for (let c = 0; c < 240; c++) {
    const slice = fc.slice(c * 5, c * 5 + 5)
    const min = Math.min(...slice)
    const level = Math.max(0, Math.min(4, Math.floor((min - 4.6) / 0.6)))
    cells.push(`<i class="l${level}${min <= cut ? " hot" : ""}${c === Math.floor(PICK / 5) ? " pick" : ""}"></i>`)
  }
  el.innerHTML = cells.join("")
}

function rows() {
  const order = fc.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0])
  const picked = []
  for (const [v, i] of order) { if (picked.every(([, j]) => Math.abs(j - i) > 30)) picked.push([v, i]); if (picked.length === 5) break }
  document.querySelector("[data-rows]").innerHTML = picked.map(([v, i], n) => `<li${i === PICK ? ' aria-current="true"' : ""}>
    <span class="r-n">${n + 1}</span><span class="r-at">${metres(i)}–${metres(i + 1)} м</span>
    <span class="r-bar" style="--w:${((8 - v) / 4) * 100}%"></span><span class="r-v">${fmt(v)}<small> мм</small></span></li>`).join("")
}

function ticks() {
  const g = document.querySelector("[data-ticks]")
  g.innerHTML = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2
    const r1 = i % 5 ? 41 : 38
    return `<line class="${i < 37 ? "on" : ""}${i % 5 ? "" : " major"}" x1="${60 + r1 * Math.cos(a)}" y1="${60 + r1 * Math.sin(a)}" x2="${60 + 43 * Math.cos(a)}" y2="${60 + 43 * Math.sin(a)}"/>`
  }).join("")
}

function backdrop() {
  const el = document.querySelector("[data-backdrop]")
  const y = (mm) => 560 - ((mm - 3.6) / 4.8) * 480
  const path = (arr, off) => arr.map((v, i) => `${i ? "L" : "M"}${(i / (COUNT - 1)) * 1600} ${(y(v) + off).toFixed(1)}`).join("")
  el.innerHTML = `<svg viewBox="0 0 1600 700" preserveAspectRatio="xMidYMid slice"><path class="b-fc" d="${path(fc, 0)}"/><path class="b-vtd" d="${path(vtd, 0)}"/>
    ${Array.from({ length: 9 }, (_, k) => `<path class="b-echo" d="${path(fc, (k + 1) * 26)}" style="opacity:${0.5 - k * 0.05}"/>`).join("")}
    <text class="b-num" x="1560" y="660" text-anchor="end">4,86</text></svg>`
}

function swatches() {
  const style = getComputedStyle(root)
  const names = [["--bg", "Фон"], ["--surface", "Поверхность"], ["--text", "Текст"], ["--muted", "Подписи"], ["--line", "Линии"], ["--accent", "Приоритет"], ["--danger", "Ошибка"]]
  document.querySelector("[data-swatches]").innerHTML = names.map(([v, n]) => `<li><span class="sw" style="background:var(${v})"></span><span>${n}</span><code>${style.getPropertyValue(v).trim()}</code></li>`).join("")
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ dir: root.dataset.dir, theme: root.dataset.theme })) } catch {}
}

function transition(update) {
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) { update(); return }
  document.startViewTransition(update)
}

function dock() {
  const list = document.querySelector("[data-dirs]")
  const note = document.querySelector("[data-dir-note]")
  const sync = () => {
    for (const b of list.children) b.setAttribute("aria-checked", b.dataset.id === root.dataset.dir)
    note.textContent = DIRS.find((d) => d.id === root.dataset.dir).note
    requestAnimationFrame(swatches)
  }
  list.innerHTML = DIRS.map((d, n) => `<button type="button" role="radio" data-id="${d.id}"><span class="dk-n">${n + 1}</span>${d.name}</button>`).join("")
  list.addEventListener("click", (e) => {
    const b = e.target.closest("button")
    if (!b || b.dataset.id === root.dataset.dir) return
    transition(() => { root.dataset.dir = b.dataset.id; sync(); save() })
  })
  document.addEventListener("keydown", (e) => {
    const n = Number(e.key)
    if (n >= 1 && n <= DIRS.length && !e.target.closest("input")) transition(() => { root.dataset.dir = DIRS[n - 1].id; sync(); save() })
  })
  sync()
}

function theme() {
  const button = document.querySelector("[data-theme-toggle]")
  const label = document.querySelector("[data-theme-label]")
  const sync = () => { label.textContent = root.dataset.theme === "dark" ? "Светлая тема" : "Тёмная тема" }
  button.addEventListener("click", () => transition(() => { root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark"; sync(); swatches(); save() }))
  sync()
}

function controls() {
  for (const group of document.querySelectorAll('[role="radiogroup"]:not([data-dirs])')) {
    group.addEventListener("click", (e) => {
      const b = e.target.closest('[role="radio"]')
      if (!b) return
      for (const r of group.querySelectorAll('[role="radio"]')) r.setAttribute("aria-checked", r === b)
    })
  }
  const range = document.querySelector("[data-range]")
  const paint = () => range.style.setProperty("--p", `${(range.value / range.max) * 100}%`)
  range.addEventListener("input", paint)
  paint()
}

new ResizeObserver(chart).observe(document.querySelector("[data-chart]"))
strip()
rows()
ticks()
backdrop()
dock()
theme()
controls()
