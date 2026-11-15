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
    camera.far = D * 2
    camera.position.set(960, -540, D)
    camera.lookAt(960, -540, 0)
    camera.updateProjectionMatrix()
    const pipe = new THREE.Group()
    pipe.position.set(0, -IMP.y, 0)
    pipe.rotation.x = 0.35
    scene.add(pipe)
    const tones = ["--brand-accent", "--ink-650", "--ink-500", "--ink-400", "--ink-300"]
    const bodies = el._sections.map((sec, i) => {
      const mat = new THREE.MeshStandardMaterial({ color: deckPipes.color(tones[i]), metalness: i ? 0.65 : 0.3, roughness: i ? 0.32 : 0.4 })
      const holder = new THREE.Group()
      holder.position.x = sec.from
      const body = new THREE.Mesh(new THREE.CylinderGeometry(IMP.r, IMP.r, 1, 96).rotateZ(Math.PI / 2).translate(0.5, 0, 0), mat)
      holder.add(body)
      holder.scale.x = 0.0001
      pipe.add(holder)
      return { holder, len: sec.to - sec.from, at: 0.35 + i * 0.18 }
    })
    const rings = []
    const ring = (x, w, big, at) => {
      const g = new THREE.Group()
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(IMP.r * (big ? 1.32 : 1.1), IMP.r * (big ? 1.32 : 1.1), w, 96).rotateZ(Math.PI / 2), big ? steel : edge)
      g.add(disc)
      if (big) {
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2
          const bolt = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, w + 6, 10).rotateZ(Math.PI / 2), edge)
          bolt.position.set(0, Math.cos(a) * IMP.r * 1.18, Math.sin(a) * IMP.r * 1.18)
          g.add(bolt)
        }
      }
      g.position.x = x
      g.scale.setScalar(0.0001)
      pipe.add(g)
      rings.push({ g, at })
    }
    ring(IMP.x0 - 18, 36, true, 0.25)
    ring(IMP.x1 + 18, 36, true, 0.25)
    el._sections.slice(0, -1).forEach((sec, i) => ring(sec.to, 10, false, 0.5 + i * 0.18))
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
      pipe.rotation.x = 0.35 + 0.04 * Math.sin(t * 0.5)
    })
  },
  leave(el) {
    deckPipes.drop(el.querySelector(".imp-scene"))
  },
})
