import { ms } from "./kit-controls.js"

export function table(root) {
  const body = root.querySelector("tbody")
  const heads = [...root.querySelectorAll("th")]
  for (const th of heads) {
    const b = th.querySelector(".sort-button")
    if (!b) continue
    b.addEventListener("click", () => {
      const next = th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending"
      for (const h of heads) h.removeAttribute("aria-sort")
      th.setAttribute("aria-sort", next)
      b.querySelector("use").setAttribute("href", `icons.svg#sort-${next === "ascending" ? "asc" : "desc"}`)
      const col = heads.indexOf(th)
      const dir = next === "ascending" ? 1 : -1
      const key = (tr) => tr.children[col].dataset.sort ?? tr.children[col].textContent.trim()
      const rows = [...body.rows].sort((x, y) => {
        const [a, c] = [key(x), key(y)]
        const na = Number(a)
        const nc = Number(c)
        return (Number.isNaN(na) || Number.isNaN(nc) ? a.localeCompare(c, "ru") : na - nc) * dir
      })
      body.append(...rows)
    })
  }
  const all = root.querySelector("thead input[type=checkbox]")
  const boxes = [...body.querySelectorAll("input[type=checkbox]")]
  const sync = () => {
    const n = boxes.filter((b) => b.checked).length
    all.checked = n === boxes.length
    all.indeterminate = n > 0 && n < boxes.length
    for (const b of boxes) b.closest("tr").setAttribute("aria-selected", String(b.checked))
    root.querySelector("[data-selected]").textContent = n ? `Выбрано: ${n}` : "Ничего не выбрано"
  }
  for (const b of boxes) b.addEventListener("change", sync)
  all.addEventListener("change", () => {
    for (const b of boxes) b.checked = all.checked
    sync()
  })
  sync()
}

export function skeletonDemo(root) {
  const content = root.querySelector("[data-content]")
  const skeleton = root.querySelector("[data-skeleton]")
  const note = root.querySelector("[data-note]")
  for (const b of root.querySelectorAll("[data-latency]"))
    b.addEventListener("click", () => {
      const latency = Number(b.dataset.latency)
      const t0 = performance.now()
      let shownAt = 0
      content.hidden = true
      skeleton.hidden = true
      const reveal = setTimeout(() => {
        skeleton.hidden = false
        shownAt = performance.now()
      }, ms("--delay-skeleton"))
      setTimeout(() => {
        clearTimeout(reveal)
        const wait = shownAt ? Math.max(0, ms("--hold-skeleton") - (performance.now() - shownAt)) : 0
        setTimeout(() => {
          skeleton.hidden = true
          content.hidden = false
          const spent = Math.round(performance.now() - t0)
          note.textContent = shownAt
            ? `Ответ за ${latency} мс, скелетон держался до ${spent} мс`
            : `Ответ за ${latency} мс, скелетон не понадобился`
        }, wait)
      }, latency)
    })
}

export function countdown(root) {
  const out = root.querySelector("[data-count]")
  const button = root.querySelector("[data-retry]")
  let left = Number(out.dataset.count)
  const tick = () => {
    left = left <= 1 ? Number(out.dataset.count) : left - 1
    out.textContent = `${left} с`
  }
  setInterval(tick, 1000)
  button?.addEventListener("click", () => {
    left = Number(out.dataset.count) + 1
    tick()
  })
}

export function indeterminate() {
  for (const i of document.querySelectorAll("[data-indeterminate]")) i.indeterminate = true
}
