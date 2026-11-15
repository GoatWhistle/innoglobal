(() => {
  const kit = window.deckKit
  if (!kit?.print) return

  ;(window.deckPrintScenes ??= {}).scale = (el) => {
    el.classList.add("is-plain")
  }
})()
