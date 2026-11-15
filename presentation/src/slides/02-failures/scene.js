const failCache = new Map()
const failTex = (name, make) => (THREE) => {
  if (!failCache.has(name)) failCache.set(name, make(THREE))
  return failCache.get(name).clone()
}
const FAIL_X = 2.2
const FAIL_POINTS = [
  [-1.6, 0.38, 0.6],
  [-0.2, 0.55, 0.45],
  [FAIL_X, -0.45, 0.55],
  [FAIL_X, -1.2, 0.01],
]
const FAIL_OFFSETS = [
  [-120, -330],
  [70, -330],
  [90, -390],
  [110, -470],
]

const failDefect = (group) =>
  group.children.find((child) => child.isGroup && child.children.some((part) => part.geometry?.type === "TubeGeometry"))

const failState = { stops: [], uniforms: null, show: null, raf: 0, leak: null }

const failHalt = () => {
  for (const stop of failState.stops) stop()
  failState.stops = []
  cancelAnimationFrame(failState.raf)
}

const failBlotMake = (THREE) => {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 256
  const c = canvas.getContext("2d")
  const random = deckKit.rng(77)
  c.fillStyle = "black"
  c.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 40; i++) {
    const a = random() * Math.PI * 2
    const d = random() * 60
    const x = 128 + Math.cos(a) * d
    const y = 128 + Math.sin(a) * d * 0.7
    const r = 40 + random() * 50
    const g = c.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, "rgba(255,255,255,0.55)")
    g.addColorStop(1, "rgba(255,255,255,0)")
    c.fillStyle = g
    c.fillRect(0, 0, 256, 256)
  }
  const texture = new THREE.CanvasTexture(canvas)
  return texture
}

const failBlot = failTex("blot", failBlotMake)

const failLeak = (el) => {
  const a = deckActor.actor(el)
  if (!a) return null
  const { THREE, extras, group } = a
  const defect = failDefect(group)
  const discharge = defect?.children.find((child) => child.isGroup)
  if (discharge) discharge.visible = false
  const oil = new THREE.MeshStandardMaterial({ color: deckPipes.color("--crude-pitch"), metalness: 0.35, roughness: 0.12 })
  const stain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.727, 0.727, 1.4, 96, 1, true, -Math.PI / 2 - 0.55, 1.1).rotateZ(Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: deckPipes.color("--crude-pitch"),
      metalness: 0.35,
      roughness: 0.12,
      alphaMap: failBlot(THREE),
      alphaTest: 0.99,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
  )
  stain.position.x = FAIL_X
  extras.add(stain)
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 16), oil)
  bead.scale.set(1.4, 0.7, 1)
  bead.position.set(FAIL_X, -0.73, 0.02)
  extras.add(bead)
  const drops = Array.from({ length: 4 }, (_, i) => {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), oil)
    drop.visible = false
    extras.add(drop)
    return { drop, phase: i / 4 }
  })
  const down = new THREE.Vector3()
  const inverse = new THREE.Quaternion()
  return {
    set(open, time) {
      stain.material.alphaTest = Math.max(0.02, 0.99 - open * 0.97)
      stain.visible = open > 0.02
      bead.visible = open > 0.15
      bead.scale.set(1.4 * open, 0.7 * open, open)
      inverse.copy(group.quaternion).invert()
      down.set(0, -1, 0).applyQuaternion(inverse)
      if (el._blot) {
        el._soak = open < 0.05 ? 0 : Math.min(1, (el._soak ?? 0) + 0.004)
        const k = deckKit.reduced ? open : el._soak
        el._blot.set(open, k)
      }
      for (const { drop, phase } of drops) {
        const age = (time * 0.55 + phase) % 1
        drop.visible = false
        drop.position.set(FAIL_X, -0.75, 0.02).addScaledVector(down, age * age * 1.1)
        drop.scale.set(0.8, 1 + age * 0.8, 0.8).multiplyScalar(1 - age * 0.5)
      }
    },
  }
}

const failOpen = (el, { corrosionAt, ruptureAt, corrosionDur = 1200, ruptureDur = 1100 }) => {
  const a = deckActor.actor(el)
  if (!a) return
  const { uniforms } = a.parts
  const defect = failDefect(a.group)
  failHalt()
  const leak = failLeak(el)
  let opened = uniforms.rupture.value
  const show = (open) => {
    opened = open
    if (!defect) return
    defect.visible = open > 0.001
    defect.scale.setScalar(Math.max(open, 0.001))
  }
  const start = performance.now()
  const frame = (now) => {
    failState.raf = requestAnimationFrame(frame)
    leak?.set(opened, (now - start) / 1000)
  }
  failState.raf = requestAnimationFrame(frame)
  failState.uniforms = uniforms
  failState.show = show
  uniforms.defectX.value = FAIL_X
  if (defect) defect.position.x = FAIL_X
  const corrosion = uniforms.corrosion.value
  const rupture = uniforms.rupture.value
  show(rupture)
  failState.stops.push(
    deckKit.tween({ dur: corrosionDur, delay: corrosionAt, curve: "inOut", update: (v) => (uniforms.corrosion.value = corrosion + (1 - corrosion) * v) }),
    deckKit.tween({
      dur: ruptureDur,
      delay: ruptureAt,
      update: (v) => {
        const open = rupture + (1 - rupture) * v
        uniforms.rupture.value = open
        show(open)
      },
    }),
  )
}

const failSeal = () => {
  const { uniforms, show } = failState
  if (!uniforms) return
  failHalt()
  const corrosion = uniforms.corrosion.value
  const rupture = uniforms.rupture.value
  failState.stops.push(
    deckKit.tween({
      dur: 500,
      update: (v) => {
        uniforms.corrosion.value = corrosion * (1 - v)
        uniforms.rupture.value = rupture * (1 - v)
        show?.(rupture * (1 - v))
      },
    }),
  )
}

const failRustMake = (THREE) => {
  const [canvas, c] = failCanvas(512, 512)
  const random = deckKit.rng(4021)
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const rust = new THREE.Color(css("--wall-rust") || "sienna")
  const dark = new THREE.Color(css("--ink-800") || "black")
  const tone = (k) => `#${rust.clone().lerp(dark, k).getHexString()}`
  c.save()
  c.beginPath()
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2
    const r = 190 + Math.sin(a * 3 + 1.3) * 30 + Math.sin(a * 8) * 12
    c.lineTo(256 + Math.cos(a) * r * 1.1, 256 + Math.sin(a) * r * 0.85)
  }
  c.closePath()
  c.clip()
  c.fillStyle = tone(0.35)
  c.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 160; i++) {
    const x = random() * 512
    const y = random() * 512
    const r = 20 + random() * 60
    const g = c.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, tone(random() * 0.6))
    g.addColorStop(1, "transparent")
    c.globalAlpha = 0.5
    c.fillStyle = g
    c.fillRect(x - r, y - r, r * 2, r * 2)
  }
  c.restore()
  const fade = c.createRadialGradient(256, 256, 20, 256, 256, 250)
  fade.addColorStop(0, "rgba(0,0,0,1)")
  fade.addColorStop(1, "rgba(0,0,0,0.55)")
  c.globalCompositeOperation = "destination-in"
  c.fillStyle = fade
  c.fillRect(0, 0, 512, 512)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

const failRust = failTex("rust", failRustMake)

const failMarks = (a) => {
  const { THREE, extras } = a
  const map = failRust(THREE)
  const rust = new THREE.MeshStandardMaterial({
    map,
    alphaTest: 0.999,
    roughness: 1,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  const patch = new THREE.Mesh(new THREE.CylinderGeometry(0.724, 0.724, 1.1, 96, 1, true, -0.35, 1.6).rotateZ(Math.PI / 2), rust)
  patch.position.x = -1.6
  extras.add(patch)
  const steel = new THREE.MeshStandardMaterial({ color: deckPipes.color("--deck-fg-3"), metalness: 0.6, roughness: 0.35, transparent: true, opacity: 0 })
  const weld = new THREE.Mesh(new THREE.TorusGeometry(0.726, 0.022, 12, 128).rotateY(Math.PI / 2), steel)
  weld.position.x = -0.2
  extras.add(weld)
  const dark = new THREE.MeshBasicMaterial({ color: deckPipes.color("--deck-fg"), transparent: true, opacity: 0 })
  const crack = new THREE.Mesh(new THREE.TorusGeometry(0.744, 0.012, 6, 64, 1.1).rotateY(Math.PI / 2).rotateX(0.15), dark)
  crack.position.x = -0.16
  extras.add(crack)
  weld.renderOrder = 5
  crack.renderOrder = 6
  deckKit.tween({ dur: 1100, delay: 1300, curve: "inOut", update: (v) => (rust.alphaTest = 0.999 - v * 0.499) })
  deckKit.tween({
    dur: 700,
    delay: 1500,
    update: (v) => {
      steel.opacity = v
      dark.opacity = v
      weld.scale.setScalar(1.12 - 0.12 * v)
    },
  })
}

const failCanvas = (w, h) => {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  return [canvas, canvas.getContext("2d")]
}

const failTone = (THREE) => {
  const tone = (name) => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "gray")
  const umber = tone("--crude-umber")
  const sand = tone("--crude-amber")
  const pitch = tone("--crude-pitch")
  const paper = tone("--surface-base")
  const mix = (a, b, k) => `#${a.clone().lerp(b, k).getHexString()}`
  return { umber, sand, pitch, paper, mix }
}

const FAIL_TOP = 1.3
const FAIL_DEPTH = 3.9

const failStrataMake = (THREE) => {
  const W = 2048
  const H = 754
  const [canvas, c] = failCanvas(W, H)
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const v = (y) => ((FAIL_TOP - y) / FAIL_DEPTH) * H
  const random = deckKit.rng(311)
  c.fillStyle = css("--ink-100") || "gainsboro"
  c.fillRect(0, 0, W, H)
  const fill = v(-1.05)
  const edge = (x) => fill + Math.sin(x * 0.006) * 10 + Math.sin(x * 0.021 + 2) * 4
  c.save()
  c.beginPath()
  c.moveTo(0, H)
  for (let x = 0; x <= W; x += 16) c.lineTo(x, edge(x))
  c.lineTo(W, H)
  c.closePath()
  c.clip()
  c.strokeStyle = css("--ink-300") || "gray"
  c.lineWidth = 4
  for (let x = -H; x < W + H; x += 46) {
    c.beginPath()
    c.moveTo(x, H)
    c.lineTo(x + H, 0)
    c.stroke()
  }
  c.restore()
  c.fillStyle = css("--ink-400") || "gray"
  for (let i = 0; i < 700; i++) {
    const x = random() * W
    const y = v(FAIL_TOP - 0.05) + random() * (edge(x) - v(FAIL_TOP - 0.05))
    c.globalAlpha = 0.25 + random() * 0.3
    c.beginPath()
    c.arc(x, y, 2.5 + random() * 2.5, 0, Math.PI * 2)
    c.fill()
  }
  c.globalAlpha = 1
  c.strokeStyle = css("--ink-500") || "gray"
  c.lineWidth = 2
  c.setLineDash([14, 10])
  c.beginPath()
  for (let x = 0; x <= W; x += 16) c[x ? "lineTo" : "moveTo"](x, edge(x))
  c.stroke()
  c.setLineDash([])
  c.strokeStyle = css("--ink-800") || "black"
  c.lineWidth = 6
  c.beginPath()
  c.moveTo(0, 3)
  c.lineTo(W, 3)
  c.stroke()
  const halo = (y0, y1) => {
    const g = c.createLinearGradient(0, y0, 0, y1)
    g.addColorStop(0, "rgba(0,0,0,0.22)")
    g.addColorStop(1, "rgba(0,0,0,0)")
    c.fillStyle = g
    c.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0))
  }
  halo(v(-0.7), v(-0.95))
  halo(v(0.7), v(0.92))
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

const failTurfMake = (THREE) => {
  const [canvas, c] = failCanvas(512, 128)
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  c.fillStyle = css("--ink-200") || "silver"
  c.fillRect(0, 0, 512, 128)
  c.strokeStyle = css("--ink-500") || "gray"
  c.lineWidth = 2
  for (let x = 6; x < 512; x += 26) {
    c.beginPath()
    c.moveTo(x, 128)
    c.lineTo(x + 14, 100)
    c.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(5, 1)
  return texture
}

const failSeepMake = (THREE) => {
  const S = 1024
  const [canvas, c] = failCanvas(S, S)
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const ink = `#${new THREE.Color(css("--crude-pitch") || "black").lerp(new THREE.Color(css("--crude-umber") || "black"), 0.3).getHexString()}`
  const plume = (scale, seed) => {
    const depth = 880 * scale
    const width = 380 * scale
    const neck = 30 + 26 * scale
    const half = (d) => {
      const bulb = Math.sqrt(Math.max(0, 1 - ((d - 0.6) / 0.4) ** 2))
      const sway = 1 + 0.07 * Math.sin(d * 5 + seed)
      return neck * Math.max(0, 1 - d * 1.5) ** 1.5 + width * bulb * sway
    }
    const lean = (d) => 26 * scale * Math.sin(d * 3 + seed)
    const N = 200
    c.beginPath()
    c.moveTo(S / 2 - half(0), 0)
    for (let i = 1; i <= N; i++) c.lineTo(S / 2 + lean(i / N) - half(i / N), (i / N) * depth)
    for (let i = N; i >= 0; i--) c.lineTo(S / 2 + lean(i / N) + half(i / N), (i / N) * depth)
    c.closePath()
    c.fill()
  }
  c.fillStyle = ink
  c.globalAlpha = 0.2
  plume(1, 1.3)
  c.globalAlpha = 0.34
  plume(0.78, 1.3)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

const failStrata = failTex("strata", failStrataMake)
const failTurf = failTex("turf", failTurfMake)
const failSeep = failTex("seep", failSeepMake)

const failGroundMake = (a) => {
  const { THREE } = a
  const tone = (name) => deckPipes.color(name)
  const group = new THREE.Group()
  const face = new THREE.MeshBasicMaterial({ map: failStrata(THREE) })
  const soil = new THREE.MeshBasicMaterial({ color: tone("--ink-100") })
  const turf = new THREE.MeshBasicMaterial({ map: failTurf(THREE) })
  const block = new THREE.Mesh(new THREE.BoxGeometry(10.6, FAIL_DEPTH, 2.6), [soil, soil, turf, soil, face, soil])
  block.position.set(0, FAIL_TOP - FAIL_DEPTH / 2, -1.3)
  group.add(block)
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 2.3).translate(0, -1.15, 0),
    new THREE.MeshBasicMaterial({
      map: failSeep(THREE),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    }),
  )
  halo.position.set(FAIL_X, -0.64, 0.004)
  const profile = []
  for (let i = 0; i <= 48; i++) {
    const d = i / 48
    const bulb = Math.sqrt(Math.max(0, 1 - ((d - 0.6) / 0.4) ** 2))
    profile.push(new THREE.Vector2(0.2 * Math.max(0, 1 - d * 1.5) ** 1.5 + 0.4 * bulb + (d === 0 ? 0.04 : 0), -d))
  }
  profile.push(new THREE.Vector2(0, -1))
  const body = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 72),
    new THREE.MeshStandardMaterial({ color: tone("--crude-pitch"), metalness: 0.55, roughness: 0.16, side: THREE.DoubleSide }),
  )
  body.renderOrder = 7
  body.position.set(FAIL_X, -0.6, 0)
  halo.visible = false
  body.visible = false
  group.add(halo, body)
  group.userData.seep = {
    set(open, k) {
      const on = open > 0.05
      halo.visible = on
      body.visible = on
      halo.material.opacity = Math.min(1, k * 3)
      halo.scale.set(0.5 + 0.5 * k, 0.2 + 0.8 * k, 1)
      const w = 0.4 + 0.6 * k
      body.scale.set(w, 0.1 + 0.9 * k, w * 0.6)
    },
  }
  return group
}

const failGround = (el) => deckActor.prop(el, "ground", failGroundMake)?.userData.seep ?? null

const failPlace = (el) => {
  const a = deckActor.actor(el)
  if (!a) return () => {}
  const cards = [...el.querySelectorAll(".holo")]
  const lines = [...el.querySelectorAll(".holo-line")]
  const dots = [...el.querySelectorAll(".holo-dot")]
  const at = (x, y, z) => deckPipes.project(a.engine, a.group, new a.THREE.Vector3(x, y, z), a.host)
  let id = 0
  const frame = () => {
    id = requestAnimationFrame(frame)
    FAIL_POINTS.forEach((point, i) => {
      const p = at(...point)
      const top = Math.min(at(point[0], FAIL_TOP, 0).y, at(point[0], FAIL_TOP, -2.6).y, at(point[0] + 2.4, FAIL_TOP, -2.6).y, at(point[0] - 2.4, FAIL_TOP, -2.6).y)
      const card = cards[i]
      const w = card.offsetWidth
      const h = card.offsetHeight
      const x = Math.min(Math.max(p.x + 60, 120), 1800 - w)
      const y = Math.max(232, top - h - 34)
      card.style.setProperty("--hx", `${x}px`)
      card.style.setProperty("--hy", `${y}px`)
      lines[i].setAttribute("points", `${p.x.toFixed(1)},${p.y.toFixed(1)} ${x.toFixed(1)},${(y + h).toFixed(1)}`)
      dots[i].setAttribute("cx", p.x.toFixed(1))
      dots[i].setAttribute("cy", p.y.toFixed(1))
    })
  }
  frame()
  return () => cancelAnimationFrame(id)
}

const failTour = (el, keys) => {
  const list = []
  for (const [at, pose, dur] of keys) {
    for (const [key, value] of Object.entries(pose)) list.push([at, `${key}:${value}`, dur])
  }
  deckActor.tour(el, list)
}

const failKeys = [
  [1.8, { cx: 1250, cy: 700, len: 2000, rx: 0.12, ry: -0.2 }, 1.7],
  [7.4, { cx: 1000, cy: 700, len: 2100, rx: 0.1, ry: 0.25 }, 1.7],
  [13, { cx: 640, cy: 690, len: 1900, rx: 0.12, ry: 0.06 }, 1.9],
  [19.6, { cx: 600, cy: 610, len: 1400, rx: 0.16, ry: 0.12 }, 2.2],
]

deckScene("failures", {
  init() {
    const THREE = window.deckPipe3d?.THREE
    if (!THREE) return
    for (const make of [failStrata, failTurf, failSeep, failRust, failBlot]) make(THREE).dispose()
  },
  enter(el) {
    const a = deckActor.actor(el)
    if (!a) return
    failMarks(a)
    el._blot = failGround(el)
    a.parts.uniforms.corrosion.value = 0
    a.parts.uniforms.rupture.value = 0
    failTour(el, failKeys)
    failOpen(el, { corrosionAt: deckKit.reduced ? 0 : 15200, ruptureAt: deckKit.reduced ? 0 : 19200, corrosionDur: deckKit.reduced ? 1 : 3200, ruptureDur: deckKit.reduced ? 1 : 1400 })
    el._place?.()
    el._place = failPlace(el)
  },
  leave(el) {
    el._place?.()
    el._place = null
    failSeal()
  },
})
