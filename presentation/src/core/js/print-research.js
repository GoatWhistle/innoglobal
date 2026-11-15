(() => {
  const kit = window.deckKit
  if (!kit?.print) return
  const ROW = 112
  const TICK = [96, 128]

  const shift = (lens) => {
    const svg = lens.querySelector("svg")
    const x = lens._x
    if (!svg || !x || !lens._items?.length) return false
    for (const { a, s, bottom } of lens._items) {
      const from = x(a + s)
      const to = x(a)
      const dir = Math.sign(to - from)
      const ghost = kit.svg("line", { x1: from, x2: from, y1: TICK[0], y2: TICK[1], class: "lens-weld is-b is-ghost" })
      svg.insertBefore(ghost, bottom)
      if (Math.abs(to - from) < 14) continue
      const tip = to - dir * 7
      kit.svg("path", { d: `M${(from + dir * 5).toFixed(1)} ${ROW}H${tip.toFixed(1)}M${(tip - dir * 7).toFixed(1)} ${ROW - 6}L${tip.toFixed(1)} ${ROW}L${(tip - dir * 7).toFixed(1)} ${ROW + 6}`, class: "lens-shift" }, svg)
    }
    return true
  }

  const legend = (lens) => {
    const list = document.createElement("p")
    list.className = "print-legend"
    for (const [kind, key] of [["is-ghost", "print.before"], ["is-solid", "print.after"]]) {
      const item = document.createElement("span")
      item.className = kind
      item.textContent = kit.t(key)
      list.append(item)
    }
    lens.append(list)
  }

  ;(window.deckPrintScenes ??= {}).research = (el) => {
    const lenses = [...el.querySelectorAll(".odo-lens")]
    const done = lenses.map(shift)
    if (!done.some(Boolean)) return
    legend(lenses[lenses.length - 1])
    el.classList.add("is-shifted")
  }
})()
