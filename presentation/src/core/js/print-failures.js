(() => {
  if (!window.deckKit?.print) return
  const UNIT = 133
  const TILE = { w: 396, h: 600, top: 276 }
  const SPOTS = [-1.6, -0.2, 2.2, 2.2]
  const SHIFTS = [-0.2, 0.55, 0, 0]
  const VIEWS = [
    { pose: "rx:0.14 ry:0 oil:1", corrosion: 0, rupture: 0, frames: 30 },
    { pose: "rx:0.14 ry:0 oil:1", corrosion: 0, rupture: 0, frames: 12 },
    { pose: "rx:-0.22 ry:0 oil:0", corrosion: 1, rupture: 0, frames: 24 },
    { pose: "rx:0.14 ry:0 oil:1", corrosion: 1, rupture: 1, frames: 45 },
  ]

  const spot = (i) => (typeof FAIL_POINTS === "undefined" ? SPOTS[i] : (FAIL_POINTS[i]?.[0] ?? SPOTS[i]))

  const crack = (a, x) => {
    const { THREE, extras } = a
    const random = window.deckKit.rng(57)
    const points = []
    for (let i = 0; i <= 9; i++) {
      const angle = 0.05 + (i / 9) * 1.4
      const side = x + 0.05 + (random() - 0.5) * 0.11
      points.push(new THREE.Vector3(side, Math.sin(angle) * 0.75, Math.cos(angle) * 0.75))
    }
    const line = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.2)
    const tone = window.deckPipes.color("--wall-rust").lerp(window.deckPipes.color("--ink-950"), 0.35)
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(line, 120, 0.014, 6), new THREE.MeshBasicMaterial({ color: tone }))
    mesh.renderOrder = 7
    extras.add(mesh)
  }

  const defectOf = (group) =>
    group.children.find((child) => child.isGroup && child.children.some((part) => part.geometry?.type === "TubeGeometry"))

  const apply = (el, a, view, x) => {
    window.deckPrint.pose(el, `cx:${Math.round(960 - x * UNIT)} cy:540 len:${Math.round(UNIT * 11.8)} ${view.pose}`)
    const { uniforms } = a.parts
    uniforms.corrosion.value = view.corrosion
    uniforms.rupture.value = view.rupture
    const defect = defectOf(a.group)
    if (defect) {
      defect.visible = view.rupture > 0
      defect.scale.setScalar(Math.max(view.rupture, 0.001))
    }
    for (const part of a.extras.children) {
      const stain = Boolean(part.material?.alphaMap && !part.material.map)
      const bead = part.geometry?.type === "SphereGeometry"
      if (!stain && !bead) continue
      part.visible = view.rupture > 0 && (stain || part.geometry.parameters.radius > 0.05)
      if (stain) part.material.alphaTest = 0.02
    }
    el._blot?.set?.(view.rupture, view.rupture)
  }

  const capture = (source) => {
    const k = source.width / 1920
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(TILE.w * k)
    canvas.height = Math.round(TILE.h * k)
    canvas.getContext("2d").drawImage(source, (960 - TILE.w / 2) * k, TILE.top * k, TILE.w * k, TILE.h * k, 0, 0, canvas.width, canvas.height)
    return canvas
  }

  ;(window.deckPrintScenes ??= {}).failures = async (el) => {
    const a = window.deckActor.actor(el)
    const source = a?.host.querySelector("canvas")
    const cards = [...el.querySelectorAll(".holo")]
    if (!source || cards.length !== VIEWS.length) return
    el._place?.()
    el._place = null
    crack(a, spot(1))
    let current = null
    window.deckPrint.loop(() => current && apply(el, a, ...current))
    const strip = document.createElement("div")
    strip.className = "print-strip"
    for (const [i, card] of cards.entries()) {
      current = [VIEWS[i], spot(i) + SHIFTS[i]]
      apply(el, a, ...current)
      await window.deckPrint.frames(VIEWS[i].frames)
      const tile = document.createElement("figure")
      tile.className = card.classList.contains("is-hot") ? "print-tile is-hot" : "print-tile"
      tile.append(card, capture(source))
      strip.append(tile)
    }
    el.append(strip)
    el.classList.add("is-strip")
  }
})()
