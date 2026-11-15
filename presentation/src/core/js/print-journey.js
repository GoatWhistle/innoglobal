(() => {
  if (!window.deckKit?.print) return
  const STILLS = {
    ili: { s: 0.1, clock: 1.2, shot: { shift: 3.4 }, fade: ["x", [0, 0], [0.32, 0], [0.46, 1], [1, 1]] },
    ut: { s: 0.126, clock: 0.775, shot: {}, fade: ["x", [0, 1], [0.52, 1], [0.66, 0], [1, 0]] },
    compare: { s: 0.4, clock: 1.2, shot: {}, fade: ["y", [0, 1], [0.5, 1], [0.6, 0], [1, 0]] },
  }

  const bake = (source, [axis, ...stops]) => {
    const canvas = document.createElement("canvas")
    canvas.width = source.width
    canvas.height = source.height
    const c = canvas.getContext("2d")
    c.drawImage(source, 0, 0)
    c.globalCompositeOperation = "destination-in"
    const gradient = axis === "x" ? c.createLinearGradient(0, 0, canvas.width, 0) : c.createLinearGradient(0, 0, 0, canvas.height)
    for (const [at, alpha] of stops) gradient.addColorStop(at, `rgba(0,0,0,${alpha})`)
    c.fillStyle = gradient
    c.fillRect(0, 0, canvas.width, canvas.height)
    source.replaceWith(canvas)
  }

  const still = (el) => {
    const journey = window.deckJourney
    const world = journey?.printLocal?.(el)
    const tune = STILLS[el.id]
    if (!world || !tune) return
    Object.assign(world.shot, tune.shot)
    world.target = { ...world.target, ...tune.shot }
    world.s = tune.s
    world.clock = tune.clock
    journey.step(world, 0.0001)
    journey.render(world)
    bake(world.renderer.domElement, tune.fade)
  }

  Object.assign((window.deckPrintScenes ??= {}), { ili: still, ut: still })
})()
