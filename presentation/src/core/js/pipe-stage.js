(() => {
  const live = new Map()
  const lib = () => window.deckPipe3d

  const drop = (host) => {
    const engine = live.get(host)
    if (!engine) return
    live.delete(host)
    engine.dispose()
  }

  const material = (host, { name = "", intro, rows, length, onPhase } = {}) => {
    drop(host)
    if (!lib()) return null
    try {
      const engine = lib().createPipe(host, name, onPhase, intro ? { intro } : {})
      engine.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25))
      engine.renderer.setSize(host.clientWidth, host.clientHeight, false)
      if (rows && length) engine.corrosionMap(rows, length)
      live.set(host, engine)
      return engine
    } catch {
      host.dataset.renderer = "failed"
      return null
    }
  }

  const wall = (host, { data, mode = "route", selected = 0, durations } = {}) => {
    drop(host)
    if (!lib()) return null
    const canvas = document.createElement("canvas")
    canvas.setAttribute("aria-hidden", "true")
    host.append(canvas)
    try {
      const engine = lib().createWallEngine(canvas, {
        onPick: () => {},
        onFrame: () => {},
        onFailure: () => {
          host.dataset.renderer = "failed"
        },
        durations: durations ?? { route: 1400, unroll: 1400, section: 1400, move: 900 },
      })
      engine.setTheme(document.documentElement.dataset.theme || "light")
      engine.resize(host.clientWidth, host.clientHeight, true)
      engine.setData(data)
      engine.select(selected, true)
      engine.setMode(mode, true)
      const dispose = engine.dispose.bind(engine)
      live.set(host, {
        ...engine,
        dispose() {
          dispose()
          canvas.remove()
        },
      })
      host.dataset.renderer = "webgl"
      return engine
    } catch {
      canvas.remove()
      host.dataset.renderer = "failed"
      return null
    }
  }

  const rows = (host) =>
    String(host.dataset.values || "")
      .split("|")
      .filter(Boolean)
      .map((row) => row.split(",").map(Number))

  const parts = (engine) => {
    const THREE = lib().THREE
    const group = engine.scene.children.find((child) => child instanceof THREE.Group)
    const meshes = []
    group.traverse((child) => {
      if (child.isMesh) meshes.push(child)
    })
    const wall = meshes.find((m) => m.material.uniforms?.cut && m.renderOrder === 3)
    const oil = meshes.find((m) => m.material.uniforms?.fillPlane)
    const label = meshes.find((m) => m.renderOrder === 4)
    const marker = meshes.find((m) => m.material.isMeshBasicMaterial && m.geometry.type === "TorusGeometry")
    return { THREE, group, wall, oil, label, marker, uniforms: wall.material.uniforms }
  }

  const color = (name) => {
    const THREE = lib().THREE
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return new THREE.Color(value || "gray")
  }

  const project = (engine, group, point, host) => {
    const v = point.clone().applyMatrix4(group.matrixWorld).project(engine.camera)
    return { x: ((v.x + 1) / 2) * host.clientWidth, y: ((1 - v.y) / 2) * host.clientHeight }
  }

  const loop = (host, tick) => {
    let id = 0
    let last = performance.now()
    const start = last
    const frame = (now) => {
      id = requestAnimationFrame(frame)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      tick((now - start) / 1000, dt)
    }
    id = requestAnimationFrame(frame)
    const engine = live.get(host)
    if (engine) {
      const dispose = engine.dispose
      engine.dispose = () => {
        cancelAnimationFrame(id)
        dispose()
      }
    }
  }

  const studio = (host, { fov = 30, distance = 8 } = {}) => {
    drop(host)
    if (!lib()) return null
    const THREE = lib().THREE
    try {
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
      renderer.setClearColor(0, 0)
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25))
      renderer.setSize(host.clientWidth, host.clientHeight, false)
      renderer.domElement.setAttribute("aria-hidden", "true")
      host.append(renderer.domElement)
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(fov, host.clientWidth / host.clientHeight, 0.1, 100)
      camera.position.set(0, 0, distance)
      scene.add(new THREE.HemisphereLight(0xdce8ef, 0x12100c, 2))
      const key = new THREE.DirectionalLight(0xffffff, 4)
      key.position.set(-2, 5, 6)
      scene.add(key)
      const fill = new THREE.DirectionalLight(0x878f99, 2)
      fill.position.set(1, -3, 2)
      scene.add(fill)
      const steel = new THREE.MeshStandardMaterial({ color: 0x303a43, metalness: 0.72, roughness: 0.27 })
      const edge = new THREE.MeshStandardMaterial({ color: 0x717d86, metalness: 0.8, roughness: 0.23 })
      const ticks = new Set()
      let id = 0
      let last = performance.now()
      const start = last
      const frame = (now) => {
        id = requestAnimationFrame(frame)
        const dt = Math.min((now - last) / 1000, 0.05)
        last = now
        for (const tick of ticks) tick((now - start) / 1000, dt)
        renderer.render(scene, camera)
      }
      id = requestAnimationFrame(frame)
      const engine = {
        THREE,
        renderer,
        scene,
        camera,
        steel,
        edge,
        tick: (fn) => ticks.add(fn),
        dispose() {
          cancelAnimationFrame(id)
          scene.traverse((object) => {
            object.geometry?.dispose()
            const materials = Array.isArray(object.material) ? object.material : [object.material]
            for (const material of materials) material?.dispose()
          })
          renderer.dispose()
          renderer.domElement.remove()
        },
      }
      live.set(host, engine)
      host.dataset.renderer = "webgl"
      return engine
    } catch {
      host.dataset.renderer = "failed"
      return null
    }
  }

  window.deckPipes = { material, wall, drop, rows, parts, color, project, loop, studio }
})()
