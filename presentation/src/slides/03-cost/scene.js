const costKpis = (el) => {
  for (const num of el.querySelectorAll(".fig")) {
    if (num.dataset.kpi) continue
    num.dataset.kpi = "1"
    num.classList.remove("count")
    const value = document.createElement("span")
    value.className = "fig-v"
    value.textContent = deckKit.fmt(Number(num.dataset.value), Number(num.dataset.digits || 0))
    const unit = document.createElement("span")
    unit.className = "fig-u"
    unit.textContent = (num.dataset.unit || "").trim()
    num.replaceChildren(value, unit)
  }
}

const costRoll = (el) => {
  for (const num of el.querySelectorAll(".fig[data-roll]")) {
    const target = Number(num.dataset.value)
    const digits = Number(num.dataset.digits || 0)
    const value = num.querySelector(".fig-v")
    num._stop?.()
    num._stop = deckKit.tween({
      to: target,
      dur: 900,
      delay: deckKit.seconds(getComputedStyle(num).getPropertyValue("--d")) * 1000,
      update: (v) => {
        value.textContent = deckKit.fmt(v, digits)
      },
    })
  }
}

deckScene("cost", {
  init(el) {
    costKpis(el)
  },
  enter(el) {
    costRoll(el)
    el._blot = failGround(el)
    failOpen(el, { corrosionAt: 0, ruptureAt: 0, corrosionDur: 300, ruptureDur: 300 })
  },
  leave(el) {
    failSeal()
  },
})
