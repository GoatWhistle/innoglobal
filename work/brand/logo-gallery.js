const KEY = "logo-gallery-favourites"
const read = () => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")) } catch { return new Set() } }
const save = (set) => { try { localStorage.setItem(KEY, JSON.stringify([...set])) } catch {} }
const favourites = read()
const grid = document.querySelector("[data-grid]")
const pick = document.querySelector("[data-pick]")
const filter = document.querySelector("[data-filter]")
const scenes = document.querySelector("[data-scenes]")

function logo(m, size) {
  if (m.wm && /svg/.test(m.wm)) return `<span class="wm" style="font-size:${size}px">${m.wm}</span>`
  if (m.wm) return `<span class="lock" style="font-size:${size}px"><span style="display:inline-flex;width:1.15em;height:1.15em">${m.icon}</span><span class="wm">${m.wm}</span></span>`
  return `<span style="display:inline-flex;width:${size * 2.2}px;height:${size * 2.2}px">${m.icon}</span>`
}

function iconAt(m, px) {
  return `<span style="display:inline-flex;width:${px}px;height:${px}px">${m.icon}</span>`
}

function card(m) {
  const on = favourites.has(m.n)
  return `<article class="card" data-n="${m.n}">
    <div class="head"><span class="num">№ ${m.n}</span><span class="name">${m.name}</span><span class="arch">${m.arch}</span>
      <button type="button" class="fav" aria-pressed="${on}">${on ? "★ В избранном" : "☆ В избранное"}</button></div>
    <p class="idea">${m.idea}</p>
    <div class="tiles">
      <div class="tile t-light">${logo(m, 44)}</div>
      <div class="tile t-dark">${logo(m, 44)}</div>
      <div class="tile t-accent">${logo(m, 34)}</div>
      <div class="tile t-inv">${logo(m, 34)}</div>
    </div>
    <div class="sizes">
      <div class="t-mono">${[16, 32, 64].map((px) => iconAt(m, px)).join("")}</div>
      <div class="t-dark">${[16, 32, 64].map((px) => iconAt(m, px)).join("")}</div>
    </div>
  </article>`
}

function sceneSet(m) {
  const word = m.name.toLowerCase()
  const head = m.wm && /svg/.test(m.wm) ? `<span class="wm" style="font-size:20px">${m.wm}</span>` : `<span class="lock" style="font-size:20px"><span style="display:inline-flex;width:1.15em;height:1.15em">${m.icon}</span><span class="wm">${word}</span></span>`
  scenes.innerHTML = `
    <div class="scene"><div class="tab"><span style="--ink:#151514;--acc:#8a5420;color:#151514">${iconAt(m, 16)} Участок 2 | ${m.name}</span><div class="url">127.0.0.1:5173/section/2</div></div></div>
    <div class="scene"><div class="app">${head}<nav><span>Участок</span><span>Журнал</span><span>Датчики</span><span>Модель</span></nav></div></div>
    <div class="scene"><div class="deck">${logo(m, 64)}<p>Две секунды до места утечки</p></div></div>
    <div class="scene"><div class="readme">${logo(m, 40)}<p>Цифровой двойник участка трубопровода: утечка по расхождению модели и датчиков.</p></div></div>`
}

grid.innerHTML = MARKS.map(card).join("")
pick.innerHTML = MARKS.map((m) => `<option value="${m.n}">№ ${m.n} · ${m.name}</option>`).join("")
sceneSet(MARKS[0])
pick.addEventListener("change", () => sceneSet(MARKS.find((m) => m.n === Number(pick.value))))
grid.addEventListener("click", (e) => {
  const button = e.target.closest(".fav")
  if (!button) return
  const n = Number(button.closest(".card").dataset.n)
  favourites.has(n) ? favourites.delete(n) : favourites.add(n)
  save(favourites)
  const on = favourites.has(n)
  button.setAttribute("aria-pressed", on)
  button.textContent = on ? "★ В избранном" : "☆ В избранное"
  if (filter.getAttribute("aria-pressed") === "true") apply()
})
function apply() {
  const only = filter.getAttribute("aria-pressed") === "true"
  for (const el of grid.children) el.hidden = only && !favourites.has(Number(el.dataset.n))
}
filter.addEventListener("click", () => { filter.setAttribute("aria-pressed", filter.getAttribute("aria-pressed") !== "true"); apply() })
