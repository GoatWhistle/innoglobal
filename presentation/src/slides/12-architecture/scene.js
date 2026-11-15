const ARCH = {
  feats: [400, 520, 640, 760],
  manifold: 430,
  rows: [
    { trunk: 420, models: [350, 490], mix: 420 },
    { trunk: 820, models: [750, 890], mix: 820 },
  ],
  split: 560,
  modelX: [680, 900],
  merge: 1000,
  mixX: [1060, 1200],
  collector: 1330,
  outs: [520, 700],
  outX: [1480, 1720],
}

const archPath = (THREE, pts, r = 26) => {
  const v = pts.map(([x, y]) => new THREE.Vector3(x, -y, 0))
  const path = new THREE.CurvePath()
  let from = v[0]
  for (let i = 1; i < v.length; i++) {
    const corner = v[i]
    const next = v[i + 1]
    if (!next) {
      path.add(new THREE.LineCurve3(from, corner))
      break
    }
    const a = corner.clone().sub(from)
    const b = next.clone().sub(corner)
    const ra = Math.min(r, a.length() / 2, b.length() / 2)
    const p1 = corner.clone().addScaledVector(a.normalize(), -ra)
    const p2 = corner.clone().addScaledVector(b.normalize(), ra)
    path.add(new THREE.LineCurve3(from, p1))
    path.add(new THREE.QuadraticBezierCurve3(p1, corner, p2))
    from = p2
  }
  return path
}

const archEdges = () => {
  const A = ARCH
  const edges = []
  const feed = []
  for (const y of A.feats) feed.push([[400, y], [A.manifold, y]])
  edges.push(...feed.map((p) => ({ p, at: 0.45, r: 9 })))
  edges.push({ p: [[A.manifold, A.feats[0] - 20], [A.manifold, A.rows[1].trunk + 20]], at: 0.6, r: 12 })
  A.rows.forEach((row, k) => {
    edges.push({ p: [[A.manifold, row.trunk], [A.split, row.trunk]], at: 0.7 + k * 0.1, r: 12 })
    row.models.forEach((my) => {
      edges.push({ p: [[A.split, row.trunk], [A.split, my], [A.modelX[0], my]], at: 0.8 + k * 0.1, r: 10 })
      edges.push({ p: [[A.modelX[1], my], [A.merge, my], [A.merge, row.mix], [A.mixX[0], row.mix]], at: 1.15 + k * 0.1, r: 10 })
    })
    edges.push({ p: [[A.mixX[1], row.mix], [A.collector, row.mix]], at: 1.45 + k * 0.1, r: 12 })
  })
  edges.push({ p: [[A.collector, A.rows[0].mix - 14], [A.collector, A.rows[1].mix + 14]], at: 1.55, r: 12 })
  A.outs.forEach((oy, i) => edges.push({ p: [[A.collector, oy], [A.outX[0], oy]], at: 1.65 + i * 0.08, r: 12, key: i === 1 }))
  return edges
}

const archRoutes = () => {
  const A = ARCH
  const routes = []
  A.rows.forEach((row, k) => {
    row.models.forEach((my, j) => {
      const fy = A.feats[(k * 2 + j) % 4]
      const oy = A.outs[(j + k) % 2]
      routes.push([
        [400, fy], [A.manifold, fy], [A.manifold, row.trunk], [A.split, row.trunk], [A.split, my], [A.modelX[1], my],
        [A.merge, my], [A.merge, row.mix], [A.mixX[1], row.mix], [A.collector, row.mix], [A.collector, oy], [A.outX[0], oy],
      ])
    })
  })
  return routes
}

deckScene("architecture", {
  enter(el) {
    const host = el.querySelector(".arch-scene")
    const D = 540 / Math.tan((2 * Math.PI) / 180)
    const s = deckPipes.studio(host, { fov: 4, distance: D })
    if (!s) return
    const { THREE, scene, camera, steel, edge } = s
    camera.far = D * 2
    camera.position.set(960, -540, D)
    camera.lookAt(960, -540, 0)
    camera.updateProjectionMatrix()
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x4a535b, metalness: 0.7, roughness: 0.3 })
    const keyMat = new THREE.MeshStandardMaterial({ color: deckPipes.color("--brand-accent"), metalness: 0.4, roughness: 0.4 })
    const tubes = archEdges().map(({ p, at, r, key }) => {
      const geo = new THREE.TubeGeometry(archPath(THREE, p), 96, r, 16, false)
      const mesh = new THREE.Mesh(geo, key ? keyMat : pipeMat)
      scene.add(mesh)
      return { geo, at, total: geo.index.count }
    })
    const tanks = []
    const tank = (x0, x1, y, r, band, at) => {
      const g = new THREE.Group()
      const len = x1 - x0 - 2 * r
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 12, 48).rotateZ(Math.PI / 2), steel)
      g.add(body)
      for (const dx of [-len / 2 + 10, len / 2 - 10]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 1.5, 2.2, 8, 64).rotateY(Math.PI / 2), edge)
        ring.position.x = dx
        g.add(ring)
      }
      if (band) {
        const belt = new THREE.Mesh(new THREE.TorusGeometry(r + 2, 4, 8, 64).rotateY(Math.PI / 2), keyMat)
        g.add(belt)
      }
      g.position.set((x0 + x1) / 2, -y, 0)
      g.scale.setScalar(0.001)
      scene.add(g)
      tanks.push({ g, at })
    }
    ARCH.rows.forEach((row, k) => {
      row.models.forEach((my, j) => tank(ARCH.modelX[0], ARCH.modelX[1], my, 34, false, 0.9 + k * 0.2 + j * 0.1))
      tank(ARCH.mixX[0], ARCH.mixX[1], row.mix, 46, false, 1.4 + k * 0.1)
    })
    ARCH.outs.forEach((oy, i) => tank(ARCH.outX[0], ARCH.outX[1], oy, 50, i === 1, 1.7 + i * 0.1))
    const routes = archRoutes().map((pts) => archPath(THREE, pts))
    const dotMat = new THREE.MeshBasicMaterial({ color: deckPipes.color("--brand-accent") })
    const dots = []
    routes.forEach((curve, i) => {
      for (let n = 0; n < 1; n++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), dotMat)
        dot.position.z = 14
        dot.visible = false
        scene.add(dot)
        dots.push({ dot, curve, phase: i / 4 })
      }
    })
    const show = (t) => {
      for (const tb of tubes) {
        const k = deckKit.ease.out(Math.max(0, Math.min(1, (t - tb.at) / 0.5)))
        tb.geo.setDrawRange(0, Math.floor((tb.total * k) / 6) * 6)
      }
      for (const tk of tanks) {
        const k = deckKit.ease.out(Math.max(0, Math.min(1, (t - tk.at) / 0.45)))
        tk.g.scale.setScalar(Math.max(0.001, k))
      }
    }
    if (deckKit.reduced) {
      show(99)
      return
    }
    show(0)
    s.tick((t) => {
      show(t)
      const flow = t - 2.2
      for (const d of dots) {
        d.dot.visible = flow > 0
        if (flow <= 0) continue
        const u = (flow * 0.06 + d.phase) % 1
        d.dot.position.copy(d.curve.getPointAt(u)).setZ(14)
        const x = d.dot.position.x
        const inTank = [ARCH.modelX, ARCH.mixX, ARCH.outX].some(([a, b]) => x > a + 6 && x < b - 6)
        d.dot.visible = !inTank
        d.dot.scale.setScalar(Math.min(1, u * 12, (1 - u) * 12))
      }
    })
  },
  leave(el) {
    deckPipes.drop(el.querySelector(".arch-scene"))
  },
})
