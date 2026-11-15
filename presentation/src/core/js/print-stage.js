(() => {
  const kit = window.deckKit
  if (!kit?.print) return
  const root = document.documentElement
  const SETTLE = 1600
  const scenes = (window.deckPrintScenes ??= {})
  const slides = []
  const loops = new Set()
  let armed = false

  window.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback
    }
    observe(target) {
      queueMicrotask(() => this.callback([{ target, isIntersecting: true, intersectionRatio: 1 }], this))
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }

  const label = (el) => {
    if (!el.dataset.pipe) return
    const a = window.deckActor.actor(el)
    const material = a?.parts.label?.material
    if (material) material.visible = window.deckActor.parse(el.dataset.pipe).label > 0.5
  }

  const frame = () => {
    requestAnimationFrame(frame)
    for (const loop of loops) loop()
  }

  const frames = (count) =>
    new Promise((resolve) => {
      let left = count
      const next = () => (left-- > 0 ? requestAnimationFrame(next) : resolve())
      next()
    })

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  const run = async (el) => {
    try {
      label(el)
      await scenes[el.id]?.(el)
    } catch (error) {
      console.error(`print scene ${el.id}`, error)
    }
  }

  const compose = async () => {
    requestAnimationFrame(frame)
    await Promise.all([wait(SETTLE), ...slides.map(run)])
    await frames(3)
    root.classList.add("is-print-ready")
  }

  window.deckPrint = {
    frames,
    loop: (fn) => loops.add(fn),
    pose(el, text) {
      window.deckActor.tour(el, [[0, text, 0]])
    },
  }
  window.deckLayers = [
    ...(window.deckLayers ?? []),
    {
      printStage(el) {
        slides.push(el)
        if (armed) return
        armed = true
        setTimeout(compose, 0)
      },
    },
  ]
})()
