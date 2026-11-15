const sensorRank = (el) => {
  const list = el.querySelector(".sensor-rank-list")
  if (!list || list.childElementCount) return
  const head = document.createElement("li")
  head.className = "is-head a"
  head.style.setProperty("--d", "1.7s")
  head.innerHTML = "<span>сегмент</span><span>прогноз, мм</span><span>P10, мм</span>"
  list.append(head)
  deckPipes.rows(el.querySelector("[data-rank]")).forEach(([seg, pred, p10], i) => {
    const li = document.createElement("li")
    li.className = `a${i === 0 ? " is-top" : ""}`
    li.style.setProperty("--d", `${(1.8 + i * 0.1).toFixed(2)}s`)
    for (const text of [String(seg), deckKit.fmt(pred, 2), deckKit.fmt(p10, 2)]) {
      const cell = document.createElement("span")
      cell.textContent = text
      li.append(cell)
    }
    list.append(li)
  })
}

deckScene("sensor", {
  init(el) {
    sensorRank(el)
    if (el._built) return
    el._built = true
    const pose = deckActor.parse(el.dataset.pipe)
    const k = pose.len / 11.8
    const W = Math.round(8.8 * k)
    const X = Math.round(pose.cx - 4.4 * k)
    const H = 250
    const svg = el.querySelector(".sensor-profile")
    svg.setAttribute("viewBox", `0 -20 ${W} ${H + 50}`)
    el.style.setProperty("--chart-x", `${X}px`)
    el.style.setProperty("--chart-w", `${W}px`)
    const rows = deckPipes.rows(el.querySelector("[data-profile]"))
    const queue = String(el.querySelector("[data-queue]").dataset.values || "")
      .split(",")
      .filter(Boolean)
      .map(Number)
    const segments = 525
    const lo = 2.4
    const hi = 8.4
    const x = (i) => ((i + 0.5) / rows.length) * W
    const y = (v) => ((hi - v) / (hi - lo)) * H
    const path = (pick) => rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(pick(r)).toFixed(1)}`).join("")
    const lower = rows
      .map((r, i) => [x(i), y(r[1])])
      .reverse()
      .map(([a, b]) => `L${a.toFixed(1)} ${b.toFixed(1)}`)
      .join("")
    const min = rows.reduce((best, r, i) => (r[0] < rows[best][0] ? i : best), 0)
    const share = x(min) / W
    const sweep = { start: 1.0, dur: 1.15 }
    const lock = sweep.start + share * sweep.dur
    el._sensor = { share, sweep, lock }

    const defs = deckKit.svg("defs", {}, svg)
    const clip = deckKit.svg("clipPath", { id: "sensor-reveal" }, defs)
    el._reveal = deckKit.svg("rect", { x: -10, y: -40, width: deckKit.reduced ? W + 20 : 0, height: H + 80 }, clip)

    deckKit.svg("line", { x1: 0, x2: W, y1: H, y2: H, class: "profile-axis f", style: "--d:0.6s" }, svg)
    const nominal = deckKit.svg("g", { class: "f", style: "--d:0.8s" }, svg)
    deckKit.svg("line", { x1: 0, x2: W, y1: y(8), y2: y(8), class: "profile-nominal" }, nominal)
    const tag = deckKit.svg("text", { x: W + 14, y: y(8) + 7, class: "profile-tag" }, nominal)
    tag.textContent = "паспорт"
    const data = deckKit.svg("g", { "clip-path": "url(#sensor-reveal)" }, svg)
    deckKit.svg("path", { d: `${path((r) => r[2])}${lower}Z`, class: "profile-band" }, data)
    deckKit.svg("path", { d: path((r) => r[0]), class: "profile-line" }, data)
    const rug = el.querySelector(".sensor-rug")
    rug.setAttribute("viewBox", `0 0 ${W} 32`)
    for (const id of queue) {
      const at = ((id + 0.5) / segments) * W
      deckKit.svg("rect", { x: at - 1.5, y: 8, width: 3, height: 16, rx: 1, class: "profile-queue" }, rug)
    }
    deckKit.svg("line", { x1: x(min), x2: x(min), y1: -Math.round(H * 0.32), y2: y(rows[min][0]), class: "profile-pin f", style: `--d:${lock.toFixed(2)}s;--t:0.4s` }, svg)
    deckKit.svg("circle", { cx: x(min), cy: y(rows[min][0]), r: 9, class: "profile-dot pop", style: `--d:${lock.toFixed(2)}s` }, svg)
  },
  enter(el) {
    const a = deckActor.actor(el)
    const s = el._sensor
    const W = parseFloat(el.style.getPropertyValue("--chart-w"))
    if (!a || !s) {
      el._reveal?.setAttribute("width", W + 20)
      return
    }
    const { THREE, engine, extras } = a
    const run = diagParts.reset(el, extras)
    const queue = String(el.querySelector("[data-queue]").dataset.values || "")
      .split(",")
      .filter(Boolean)
      .map(Number)
    engine.corrosionMap(
      queue.map((id) => ({ start_m: id * 10, end_m: id * 10 + 10, priority_rank: 1 })),
      5250,
    )
    const accent = deckPipes.color("--brand-accent")
    const ring = (opacity) => {
      const g = new THREE.Group()
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(0.8, 0.032, 16, 128),
        new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity, depthWrite: false }),
      )
      torus.rotation.y = Math.PI / 2
      torus.renderOrder = 6
      const halo = new THREE.Mesh(
        new THREE.CylinderGeometry(0.79, 0.79, 0.42, 96, 1, true).rotateZ(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }),
      )
      halo.renderOrder = 5
      g.add(torus, halo)
      extras.add(g)
      return { g, torus, halo }
    }
    const rows = deckPipes.rows(el.querySelector("[data-profile]"))
    const up = diagParts.toLocal(THREE, el, new THREE.Vector3(0, 1, 0))
    const tilt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up)
    const step = 8.8 / rows.length
    const hot = rows.map((r, i) => queue.some((id) => Math.floor((id * 10) / 50) === i))
    const bar = new THREE.BoxGeometry(step * 0.62, 1, step * 0.62).translate(0, 0.5, 0)
    const sky = (color, emissive, pick) => {
      const ids = rows.map((r, i) => i).filter(pick)
      const mesh = new THREE.InstancedMesh(
        bar,
        new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: emissive ? 0.35 : 0, metalness: 0.3, roughness: 0.5 }),
        ids.length,
      )
      mesh.frustumCulled = false
      extras.add(mesh)
      return { mesh, ids }
    }
    const skyline = [sky(deckPipes.color("--ink-300"), 0, (i) => !hot[i]), sky(accent, accent, (i) => hot[i])]
    const m4 = new THREE.Matrix4()
    const scale = new THREE.Vector3()
    const place = new THREE.Vector3()
    const grow = (p) => {
      for (const { mesh, ids } of skyline) {
        ids.forEach((i, n) => {
          const local = Math.max(0, Math.min(1, (p * 8.8 - (i + 0.5) * step) / 0.6))
          const h = Math.max(0.001, (8 - rows[i][0]) * 0.14 * deckKit.ease.out(local))
          place.copy(up).multiplyScalar(0.86).setX(-4.4 + (i + 0.5) * step)
          scale.set(1, h, 1)
          mesh.setMatrixAt(n, m4.compose(place, tilt, scale))
        })
        mesh.instanceMatrix.needsUpdate = true
      }
    }
    const scan = ring(0.55)
    const locked = ring(0.95)
    const target = -4.4 + 8.8 * s.share
    locked.g.position.x = target
    if (deckKit.reduced) {
      scan.g.visible = false
      grow(2)
      el._reveal.setAttribute("width", W + 20)
      return
    }
    locked.g.visible = false
    scan.g.position.x = -4.4
    scan.g.visible = false
    el._reveal.setAttribute("width", 0)
    grow(0)
    const start = performance.now()
    const frame = () => {
      if (!el.classList.contains("is-current") || el._run !== run) return
      requestAnimationFrame(frame)
      const t = (performance.now() - start) / 1000
      const p = Math.max(0, Math.min(1, (t - s.sweep.start) / s.sweep.dur))
      scan.g.visible = t > s.sweep.start - 0.15 && p < 1
      scan.g.position.x = -4.4 + 8.8 * p
      scan.torus.material.opacity = 0.55 * Math.min(1, (t - s.sweep.start + 0.15) / 0.15) * (p > 0.9 ? (1 - p) / 0.1 : 1)
      el._reveal.setAttribute("width", (W + 20) * p)
      grow(p + Math.max(0, t - s.sweep.start - s.sweep.dur) * 0.6)
      if (t >= s.lock) {
        locked.g.visible = true
        const pop = deckKit.ease.out((t - s.lock) / 0.4)
        locked.g.scale.setScalar(1.35 - 0.35 * pop)
        locked.torus.material.opacity = 0.95 * pop
        locked.halo.material.opacity = 0.1 + 0.08 * (0.5 + 0.5 * Math.sin((t - s.lock) * 3))
      }
    }
    requestAnimationFrame(frame)
  },
})
