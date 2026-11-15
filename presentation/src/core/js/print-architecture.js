(() => {
  const kit = window.deckKit
  if (!kit?.print) return

  ;(window.deckPrintScenes ??= {}).architecture = (el) => {
    const svg = el.querySelector(".arch")
    const arch = el._arch
    if (!svg || !arch?.xs) return
    const y = Number(arch.ball?.getAttribute("cy") ?? 512)
    arch.xs.slice(0, -1).forEach((x, i) => {
      const mid = (x + arch.xs[i + 1]) / 2
      kit.svg("path", { d: `M${mid - 7} ${y - 13}L${mid + 7} ${y}L${mid - 7} ${y + 13}`, class: "arch-chevron" }, svg)
    })
    el.classList.add("is-flow")
  }
})()
