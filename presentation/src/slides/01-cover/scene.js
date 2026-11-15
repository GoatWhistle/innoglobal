const COVER_RINGS = 19
const COVER_SPAN = 4.95

const coverRings = (el) => {
  const a = deckActor.actor(el)
  if (!a) return
  const { THREE, extras } = a
  const accent = deckPipes.color("--brand-accent")
  const paper = deckPipes.color("--deck-bg")
  const geometry = new THREE.TorusGeometry(0.742, 0.009, 8, 128)
  const rings = []
  for (let i = 0; i < COVER_RINGS; i++) {
    const material = new THREE.MeshBasicMaterial({ color: paper.clone(), transparent: true, opacity: 0 })
    const ring = new THREE.Mesh(i ? geometry.clone() : geometry, material)
    ring.rotation.y = Math.PI / 2
    ring.position.x = -COVER_SPAN + (2 * COVER_SPAN * i) / (COVER_RINGS - 1)
    ring.renderOrder = 5
    extras.add(ring)
    rings.push(ring)
  }
  const start = performance.now()
  const draw = (now) => {
    const t = deckKit.reduced ? 99 : (now - start) / 1000
    rings.forEach((ring, i) => {
      const at = 1.35 + (i / (COVER_RINGS - 1)) * 1.1
      const k = deckKit.ease.out((t - at) / 0.45)
      const wave = deckKit.reduced ? 0 : Math.max(0, Math.cos((ring.position.x / COVER_SPAN) * 2.2 - (t - 2.8) * 1.6)) ** 12
      ring.material.opacity = k * (0.5 + 0.5 * wave)
      ring.material.color.copy(paper).lerp(accent, wave)
      ring.scale.setScalar(0.92 + 0.08 * k)
    })
    if (!deckKit.reduced) el._ringsFrame = requestAnimationFrame(draw)
  }
  draw(start)
}

deckScene("cover", {
  init(el) {
    deckKit.letters(el.querySelector(".wordmark"))
  },
  enter(el) {
    cancelAnimationFrame(el._ringsFrame)
    coverRings(el)
  },
  leave(el) {
    cancelAnimationFrame(el._ringsFrame)
  },
})
