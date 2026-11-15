(() => {
  const SLIDES = ["ili", "ut", "compare"]
  const R = 0.82
  const INNER = 0.74
  const SHOTS = {
    ili: { side: 9.5, up: 2.8, lead: 1.2, ahead: 1.2, shift: 4.2, speed: 0.75, open: 1, ut: 0, at: 0.06 },
    ut: { side: 9.5, up: 3.2, lead: 1.2, ahead: 1.6, shift: -4.2, speed: 0.75, open: 0, ut: 1, at: 0.12 },
    compare: { side: 15, up: 9, lead: 9, ahead: 6, shift: 0, speed: 0.6, open: 0, ut: 0, at: 0.18 },
  }
  const state = { live: null, locals: new Map(), slide: null, timer: 0 }

  const cutShader = (material, uniforms) => {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec2 vJ;\nvarying vec3 vAxis;\nvarying vec3 vPos;\nuniform float uRad;")
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvJ = uv;\nvAxis = position - normal * uRad;\nvPos = position;",
        )
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec2 vJ;\nvarying vec3 vAxis;\nvarying vec3 vPos;\nuniform float uOpen;\nuniform float uCutA;\nuniform float uCutB;",
        )
        .replace(
          "#include <clipping_planes_fragment>",
          "#include <clipping_planes_fragment>\nif (uOpen > 0.001 && vJ.x > uCutA && vJ.x < uCutB) {\n  vec3 off = normalize(vPos - vAxis);\n  vec3 toCam = normalize(cameraPosition - vAxis);\n  float edge = min(smoothstep(uCutA, uCutA + 0.004, vJ.x), 1.0 - smoothstep(uCutB - 0.004, uCutB, vJ.x));\n  if (dot(off, toCam) > mix(1.05, 0.42, uOpen * edge)) discard;\n}",
        )
    }
  }

  const build = (host, seed = 7) => {
    const lib = window.deckPipe3d
    if (!lib || !host) return null
    const THREE = lib.THREE
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: host.classList.contains("is-local") })
    } catch {
      host.dataset.renderer = "failed"
      return null
    }
    const w = host.clientWidth || 1920
    const h = host.clientHeight || 1080
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(w, h, false)
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const paper = window.deckPipes.color("--surface-base")
    scene.fog = new THREE.Fog(paper, 22, 70)
    const camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 200)
    scene.add(new THREE.HemisphereLight(0xdce8ef, 0x12100c, 2))
    const key = new THREE.DirectionalLight(0xffffff, 4)
    key.position.set(-2, 5, 6)
    const fill = new THREE.DirectionalLight(0x878f99, 2)
    fill.position.set(1, -3, 2)
    scene.add(key, key.target, fill)

    const rnd = deckKit.rng(seed)
    const pts = []
    for (let i = 0; i <= 44; i++) {
      pts.push(new THREE.Vector3(i * 6, Math.sin(i * 0.7) * 0.9 + (rnd() - 0.5) * 0.8, Math.sin(i * 0.45 + 1) * 3.2 + (rnd() - 0.5) * 1.4))
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal")
    const length = curve.getLength()

    const uniforms = { uOpen: { value: 0 }, uCutA: { value: 0 }, uCutB: { value: 0 }, uRad: { value: R } }
    const steel = new THREE.MeshStandardMaterial({ color: 0x303a43, metalness: 0.72, roughness: 0.27, side: THREE.DoubleSide })
    cutShader(steel, uniforms)
    const innerUniforms = { ...uniforms, uRad: { value: INNER } }
    const oil = new THREE.MeshStandardMaterial({ color: 0x16191c, metalness: 0.5, roughness: 0.16, side: THREE.BackSide })
    cutShader(oil, innerUniforms)
    const segs = 1600
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segs, R, 56, false), steel))
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segs, INNER, 48, false), oil))

    const ringMat = new THREE.MeshStandardMaterial({ color: 0x3a454f, metalness: 0.8, roughness: 0.3 })
    const flange = new THREE.TorusGeometry(R + 0.02, 0.06, 10, 64)
    const weld = new THREE.TorusGeometry(R + 0.005, 0.022, 6, 64)
    const Z = new THREE.Vector3(0, 0, 1)
    const X = new THREE.Vector3(1, 0, 0)
    const frame = (u, obj, axis) => {
      obj.position.copy(curve.getPointAt(u))
      obj.quaternion.setFromUnitVectors(axis, curve.getTangentAt(u))
    }
    for (let d = 3; d < length; d += 3) {
      const ring = new THREE.Mesh(Math.round(d / 3) % 4 === 0 ? flange : weld, ringMat)
      frame(d / length, ring, Z)
      scene.add(ring)
    }

    const pigHolder = new THREE.Group()
    scene.add(pigHolder)
    const { root: pig, scan } = diagParts.pig(THREE, pigHolder)
    pig.scale.set(1.7, 0.98, 0.98)

    const glow = new THREE.MeshBasicMaterial({
      color: window.deckPipes.color("--brand-accent"),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const stations = []
    for (let d = 9; d < length - 9; d += 7.5) {
      const holder = new THREE.Group()
      frame(d / length, holder, X)
      const probe = diagParts.probe(THREE, holder, 0, new THREE.Vector3(0, 1, 0), R)
      const waves = [0, 1].map(() => {
        const m = new THREE.Mesh(new THREE.TorusGeometry(R + 0.01, 0.03, 8, 64), glow.clone())
        m.rotation.y = Math.PI / 2
        holder.add(m)
        return m
      })
      holder.visible = false
      scene.add(holder)
      stations.push({ holder, probe, waves, u: d / length, phase: rnd() })
    }

    const world = {
      THREE, renderer, scene, camera, curve, length, uniforms, innerUniforms, pig, pigHolder, scan, stations, host,
      s: 0.05, shot: { ...SHOTS.ili }, target: SHOTS.ili, utK: 0, clock: 0, raf: 0, running: false,
    }
    return world
  }

  const lerp = (a, b, k) => a + (b - a) * k

  const step = (wd, dt) => {
    const { THREE, curve, length, camera, shot, target } = wd
    const k = 1 - Math.exp(-dt * 1.4)
    for (const name of ["side", "up", "lead", "ahead", "shift", "speed", "open"]) shot[name] = lerp(shot[name], target[name], name === "open" ? 1 - Math.exp(-dt * 2.2) : k)
    wd.utK = lerp(wd.utK, target.ut, 1 - Math.exp(-dt * 2.5))
    wd.clock += dt
    wd.s = Math.min(0.92, wd.s + (shot.speed * dt) / length)
    const s = wd.s
    const focusU = Math.min(0.97, s + shot.ahead / length)
    const focus = curve.getPointAt(focusU)
    const tan = curve.getTangentAt(focusU)
    const side = new THREE.Vector3(0, 1, 0).cross(tan).normalize().negate()
    const camBase = curve.getPointAt(s)
    camera.position.copy(camBase).addScaledVector(side, shot.side).add(new THREE.Vector3(0, shot.up, 0))
    const look = curve.getPointAt(Math.max(0.001, Math.min(0.98, focusU + (shot.lead - shot.shift) / length)))
    camera.lookAt(look)

    const span = 7 / length
    wd.uniforms.uOpen.value = shot.open
    wd.uniforms.uCutA.value = focusU - span * 0.55
    wd.uniforms.uCutB.value = focusU + span * 0.45
    for (const key of ["uOpen", "uCutA", "uCutB"]) wd.innerUniforms[key].value = wd.uniforms[key].value

    const pigU = Math.min(0.97, focusU + (Math.sin(wd.clock * 0.6) * 0.5) / length)
    wd.pigHolder.visible = shot.open > 0.02
    wd.pigHolder.position.copy(curve.getPointAt(pigU))
    wd.pigHolder.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), curve.getTangentAt(pigU))
    wd.pigHolder.position.addScaledVector(curve.getTangentAt(pigU), -0.5)
    wd.scan.material.opacity = 0.45 + 0.25 * Math.sin(wd.clock * 10)

    for (const st of wd.stations) {
      const near = Math.abs(st.u - focusU) * length
      const show = wd.utK > 0.02 && near < 26
      st.holder.visible = show
      if (!show) continue
      const drop = Math.max(0, 1 - wd.utK)
      const grow = Math.min(1, wd.utK * 1.15)
      st.probe.root.scale.setScalar(Math.max(0.001, grow * grow * (3 - 2 * grow)))
      st.probe.head.position.y = 1.6 * drop
      const e = (wd.clock * 0.8 + st.phase) % 1
      st.probe.pulse.scale.setScalar(1 + e * 2.6)
      st.probe.pulse.material.opacity = 0.75 * (1 - e) * wd.utK
      st.waves.forEach((m, i) => {
        const dx = (i ? -1 : 1) * e * 2.4
        m.position.x = dx
        m.material.opacity = (1 - e) * wd.utK
      })
    }
  }

  const render = (wd) => wd.renderer.render(wd.scene, wd.camera)

  const start = (wd) => {
    if (wd.running) return
    wd.running = true
    let last = performance.now()
    const tick = (now) => {
      if (!wd.running) return
      wd.raf = requestAnimationFrame(tick)
      if (document.hidden) return
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      step(wd, dt)
      render(wd)
    }
    wd.raf = requestAnimationFrame(tick)
  }

  const stop = (wd) => {
    wd.running = false
    cancelAnimationFrame(wd.raf)
  }

  const settle = (wd, id) => {
    const shot = SHOTS[id]
    wd.target = shot
    Object.assign(wd.shot, shot)
    wd.utK = shot.ut
    wd.s = shot.at
    wd.clock = 1.2
    step(wd, 0.0001)
    render(wd)
  }

  const stage = (el) => {
    const host = document.querySelector(".stage > .deck-journey")
    if (!host) return
    const id = el?.id
    host.dataset.slide = SLIDES.includes(id) ? id : ""
    clearTimeout(state.timer)
    if (!SLIDES.includes(id)) {
      host.classList.remove("is-on")
      if (state.live) state.timer = setTimeout(() => stop(state.live), 1400)
      return
    }
    if (!state.live) state.live = build(host)
    const wd = state.live
    if (!wd) return
    const fresh = !host.classList.contains("is-on")
    if (deckKit.reduced) {
      host.classList.add("is-on")
      stop(wd)
      settle(wd, id)
      return
    }
    if (fresh) {
      wd.s = 0.05
      wd.clock = 0
      Object.assign(wd.shot, SHOTS[id], { open: 0 })
      wd.utK = 0
    }
    wd.target = SHOTS[id]
    host.classList.add("is-on")
    start(wd)
  }

  const printStage = (el) => {
    if (!SLIDES.includes(el.id) || state.locals.has(el)) return
    const host = document.createElement("div")
    host.className = "deck-journey is-local is-on"
    host.setAttribute("aria-hidden", "true")
    el.prepend(host)
    const wd = build(host)
    if (!wd) return
    settle(wd, el.id)
    state.locals.set(el, wd)
  }

  const prewarm = () => {
    if (state.live || deckKit.print) return
    const host = document.querySelector(".stage > .deck-journey")
    if (!host) return
    state.live = build(host)
    if (state.live) render(state.live)
  }
  window.addEventListener("load", () => setTimeout(prewarm, 1200))

  window.deckJourney = { stage, printStage, printLocal: (el) => state.locals.get(el), step, render }
  window.deckLayers = [...(window.deckLayers ?? []), window.deckJourney]
})()
