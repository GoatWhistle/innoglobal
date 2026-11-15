const IMP = { x0: 190, x1: 1730, y: 420, r: 62 }

deckScene("importance", {
  init(el) {
    const shares = String(el.querySelector("[data-groups]").dataset.values || "").split(",").map(Number)
    const sum = shares.reduce((a, b) => a + b, 0)
    const span = IMP.x1 - IMP.x0
    let cursor = IMP.x0
    el._sections = shares.map((v) => {
      const len = (v / sum) * span
      const sec = { from: cursor, to: cursor + len, mid: cursor + len / 2 }
      cursor += len
      return sec
    })
    const tags = [...el.querySelectorAll(".imp-tags li")]
    const svg = el.querySelector(".imp-leaders")
    const xs = el._sections.map((s) => s.mid)
    for (let i = tags.length - 1; i > 1; i--) xs[i - 1] = Math.min(xs[i - 1], xs[i] - 170)
    xs[xs.length - 1] = Math.min(xs[xs.length - 1], 1740)
    el._sections.forEach((sec, i) => {
      const main = i === 0 ? " is-main" : ""
      const at = (0.9 + i * 0.18).toFixed(2)
      tags[i].style.setProperty("--x", `${xs[i]}px`)
      tags[i].classList.add("a")
      tags[i].style.setProperty("--d", `${(Number(at) + 0.2).toFixed(2)}s`)
      const yTop = IMP.y + IMP.r + 14
      const bend = 578
      deckKit.svg("circle", { cx: sec.mid, cy: yTop, r: 4, class: `f${main}`, style: `--d:${at}s` }, svg)
      if (Math.abs(xs[i] - sec.mid) < 1) {
        deckKit.svg("line", { x1: sec.mid, y1: yTop, x2: sec.mid, y2: 596, class: `dr${main}`, pathLength: "1", style: `--d:${at}s;--t:0.3s` }, svg)
      } else {
        deckKit.svg("line", { x1: sec.mid, y1: yTop, x2: sec.mid, y2: bend, class: `dr${main}`, pathLength: "1", style: `--d:${at}s;--t:0.3s` }, svg)
        deckKit.svg("line", { x1: sec.mid, y1: bend, x2: xs[i], y2: bend, class: `dr${main}`, pathLength: "1", style: `--d:${at}s;--t:0.3s` }, svg)
        deckKit.svg("line", { x1: xs[i], y1: bend, x2: xs[i], y2: 596, class: `dr${main}`, pathLength: "1", style: `--d:${at}s;--t:0.3s` }, svg)
      }
    })
  },
  enter(el) {
    const host = el.querySelector(".imp-scene")
    const D = 540 / Math.tan((2 * Math.PI) / 180)
    const s = deckPipes.studio(host, { fov: 4, distance: D })
    if (!s) return
    const { THREE, scene, camera, steel, edge } = s
    camera.near = D - 1500
    camera.far = D + 1500
    camera.position.set(960, -540, D)
    camera.lookAt(960, -540, 0)
    camera.updateProjectionMatrix()
    const pipe = new THREE.Group()
    pipe.position.set(0, -IMP.y, 0)
    pipe.rotation.x = 0.25
    scene.add(pipe)
    const tones = ["--brand-accent", "--ink-650", "--ink-500", "--ink-400", "--ink-300"]
    const bodies = el._sections.map((sec, i) => {
      const mat = new THREE.MeshStandardMaterial({ color: deckPipes.color(tones[i]), metalness: i ? 0.65 : 0.3, roughness: i ? 0.32 : 0.4 })
      const holder = new THREE.Group()
      holder.position.x = sec.from
      const body = new THREE.Mesh(new THREE.CylinderGeometry(IMP.r, IMP.r, 1, 128, 1, true).rotateZ(Math.PI / 2).translate(0.5, 0, 0), mat)
      holder.add(body)
      holder.scale.x = 0.0001
      pipe.add(holder)
      return { holder, len: sec.to - sec.from, at: 0.35 + i * 0.18 }
    })
    const rings = []
    const R = IMP.r
    const profile = [[0, -22], [R * 0.9, -22], [R * 1.32, -22], [R * 1.36, -16], [R * 1.36, 16], [R * 1.32, 22], [R * 0.9, 22], [0, 22]].map(([x, y]) => new THREE.Vector2(x, y))
    const flange = (x, at) => {
      const g = new THREE.Mesh(new THREE.LatheGeometry(profile, 128).rotateZ(Math.PI / 2), steel)
      g.position.x = x
      g.scale.setScalar(0.0001)
      pipe.add(g)
      rings.push({ g, at })
    }
    el._sections.slice(0, -1).forEach((sec, i) => {
      const bead = new THREE.Mesh(new THREE.TorusGeometry(R + 1, 5, 16, 128).rotateY(Math.PI / 2), edge)
      bead.position.x = sec.to
      bead.scale.setScalar(0.0001)
      pipe.add(bead)
      rings.push({ g: bead, at: 0.5 + i * 0.18 })
    })
    flange(IMP.x0 - 16, 0.25)
    flange(IMP.x1 + 16, 0.25)
    const show = (t) => {
      for (const b of bodies) b.holder.scale.x = Math.max(0.0001, b.len * deckKit.ease.out(Math.max(0, Math.min(1, (t - b.at) / 0.7))))
      for (const r of rings) r.g.scale.setScalar(Math.max(0.0001, deckKit.ease.out(Math.max(0, Math.min(1, (t - r.at) / 0.4)))))
    }
    if (deckKit.reduced) {
      show(99)
      return
    }
    show(0)
    s.tick((t) => {
      show(t)
    })
  },
  leave(el) {
    deckPipes.drop(el.querySelector(".imp-scene"))
  },
})
