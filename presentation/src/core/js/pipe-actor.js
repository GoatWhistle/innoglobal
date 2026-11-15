(() => {
  const UNIT = 1920 / 13
  const BASE = { cx: 960, cy: 560, len: 1640, rx: 0, ry: 0, rz: 0, cut: 0, oil: 1, damage: 0, label: 0, inspect: -1 }
  const DURATION = 1.15
  const NAME = "Куст-1 - ДНС-1"
  const state = { actor: null, locals: new Map(), current: null }

  const parse = (text) => {
    const pose = { ...BASE }
    for (const part of String(text || "").trim().split(/\s+/)) {
      const [key, value] = part.split(":")
      if (key in pose && value !== undefined) pose[key] = Number(value)
    }
    return pose
  }

  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)
  const mix = (a, b, k) => a + (b - a) * k

  const create = (host) => {
    const lib = window.deckPipe3d
    if (!lib || !host) return null
    try {
      const engine = lib.createPipe(host, NAME, undefined, {})
      engine.renderer.setPixelRatio(Math.min(devicePixelRatio * 1.25, 2))
      engine.renderer.setSize(host.clientWidth, host.clientHeight, false)
      engine.cancelInspection()
      engine.zoom(1)
      const parts = window.deckPipes.parts(engine)
      return { host, engine, parts, THREE: lib.THREE, from: null, to: null, t: 1, pose: null, extras: new Map(), inspecting: false }
    } catch {
      host.dataset.renderer = "failed"
      return null
    }
  }

  const apply = (a, pose, k) => {
    const { group, uniforms, oil, label, marker } = a.parts
    const from = a.from ?? pose
    const p = Object.fromEntries(Object.keys(BASE).map((key) => [key, mix(from[key], pose[key], k)]))
    group.position.set((p.cx - 960) / UNIT, (540 - p.cy) / UNIT, 0)
    group.scale.setScalar(p.len / (11.8 * UNIT))
    if (!a.inspecting) group.rotation.set(p.rx, p.ry, p.rz)
    uniforms.overviewDamage.value = p.damage
    const late = k > 0.5 ? pose : from
    uniforms.cut.value = late.cut > 0.5 ? 1 : 0
    oil.visible = late.oil > 0.5
    label.visible = late.label > 0.5
    if (marker) marker.visible = false
  }

  const tick = (a) => {
    let last = performance.now()
    const frame = (now) => {
      a.raf = requestAnimationFrame(frame)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!a.pose) return
      if (a.tour && a.tour.el === a.slide) {
        a.tour.clock += dt
        const key = a.tour.keys.find((k) => !k.done && a.tour.clock >= k.at)
        if (key) {
          key.done = true
          a.from = { ...a.pose, ...currentPose(a) }
          a.pose = { ...a.pose, ...key.pose }
          a.dur = key.dur
          a.t = 0
        }
      }
      if (a.driver && a.driver.el === a.slide && a.arrived) {
        const next = a.driver.fn()
        if (next) {
          a.pose = { ...a.pose, ...next }
          a.from = a.pose
          a.t = 1
        }
      }
      a.t = Math.min(1, a.t + dt / (a.dur || DURATION))
      apply(a, a.pose, ease(a.t))
      const extras = a.extras.get(a.slide)
      if (a.t >= 0.92) a.arrived = true
      if (extras) extras.visible = a.arrived
      if (a.t >= 1 && a.pose.inspect >= 0 && !a.inspecting) {
        a.inspecting = true
        a.engine.inspect(a.pose.inspect)
      }
    }
    a.raf = requestAnimationFrame(frame)
  }

  const clearExtras = (a, keep) => {
    for (const [el, group] of a.extras) {
      if (el === keep) continue
      a.parts.group.remove(group)
      group.traverse((o) => {
        o.geometry?.dispose()
        const list = Array.isArray(o.material) ? o.material : [o.material]
        for (const m of list) m?.dispose()
      })
      a.extras.delete(el)
    }
  }

  const stopInspection = (a) => {
    if (!a.inspecting) return
    a.inspecting = false
    a.engine.cancelInspection()
    a.engine.zoom(1)
  }

  const stage = (el, dir = 1) => {
    const host = document.querySelector(".deck-actor")
    if (!state.actor) {
      state.actor = create(host)
      if (state.actor) tick(state.actor)
    }
    const a = state.actor
    if (!a) return
    clearExtras(a, null)
    stopInspection(a)
    a.engine.corrosionMap([], 1)
    const text = el.dataset.pipe
    clearTimeout(a.sleep)
    a.slide = el
    sweep(a, text ? 0 : 950)
    if (!text) {
      host.classList.remove("is-on")
      a.sleep = setTimeout(() => host.classList.add("is-off"), 900)
      return
    }
    if (host.classList.contains("is-off")) {
      host.classList.remove("is-off")
      void host.offsetWidth
    }
    a.slide = el
    a.tour = null
    a.driver = null
    a.host.style.opacity = ""
    a.arrived = false
    a.dur = DURATION
    const pose = parse(text)
    const visible = host.classList.contains("is-on") && a.pose
    a.from = visible ? { ...a.pose, ...currentPose(a) } : { ...pose, cx: pose.cx + (dir < 0 ? -1100 : 1100), rz: pose.rz + (dir < 0 ? 0.25 : -0.25) }
    a.pose = pose
    a.t = deckKit.reduced ? 1 : 0
    host.classList.add("is-on")
    apply(a, pose, ease(a.t))
  }

  const currentPose = (a) => {
    const { group, uniforms, oil, label } = a.parts
    return {
      cx: group.position.x * UNIT + 960,
      cy: 540 - group.position.y * UNIT,
      len: group.scale.x * 11.8 * UNIT,
      rx: group.rotation.x,
      ry: group.rotation.y,
      rz: group.rotation.z,
      damage: uniforms.overviewDamage.value,
      cut: uniforms.cut.value,
      oil: oil.visible ? 1 : 0,
      label: label.visible ? 1 : 0,
    }
  }

  const printStage = (el) => {
    if (!el.dataset.pipe || state.locals.has(el)) return
    const host = document.createElement("div")
    host.className = "deck-actor is-local is-on"
    host.setAttribute("aria-hidden", "true")
    el.prepend(host)
    const a = create(host)
    if (!a) return
    a.pose = parse(el.dataset.pipe)
    a.t = 1
    apply(a, a.pose, 1)
    state.locals.set(el, a)
    if (a.pose.inspect >= 0) {
      a.inspecting = true
      a.engine.inspect(a.pose.inspect)
    }
  }

  const actor = (el) => {
    const a = state.locals.get(el) ?? state.actor
    if (!a) return null
    let extras = a.extras.get(el)
    if (!extras) {
      extras = new a.THREE.Group()
      a.parts.group.add(extras)
      a.extras.set(el, extras)
    }
    return { THREE: a.THREE, engine: a.engine, group: a.parts.group, parts: a.parts, extras, host: a.host }
  }

  const tour = (el, keys) => {
    const a = state.locals.get(el) ?? state.actor
    if (!a) return
    const list = keys.map(([at, text, dur = 1.2]) => ({ at, dur, pose: partial(text), done: false }))
    if (deckKit.reduced || state.locals.has(el)) {
      for (const k of list) a.pose = { ...a.pose, ...k.pose }
      a.from = a.pose
      a.t = 1
      apply(a, a.pose, 1)
      return
    }
    a.tour = { el, keys: list, clock: 0 }
  }

  const partial = (text) => {
    const pose = {}
    for (const part of String(text || "").trim().split(/\s+/)) {
      const [key, value] = part.split(":")
      if (key in BASE && value !== undefined) pose[key] = Number(value)
    }
    return pose
  }

  const prop = (el, name, make) => {
    const a = state.locals.get(el) ?? state.actor
    if (!a) return null
    a.props ??= new Map()
    let entry = a.props.get(name)
    if (!entry) {
      const obj = make(a)
      a.parts.group.add(obj)
      entry = { obj }
      a.props.set(name, entry)
    }
    entry.slide = el
    return entry.obj
  }

  const sweep = (a, delay) => {
    clearTimeout(a.sweep)
    a.sweep = setTimeout(() => {
      for (const [name, entry] of a.props ?? []) {
        if (entry.slide === a.slide) continue
        a.parts.group.remove(entry.obj)
        entry.obj.traverse((o) => {
          o.geometry?.dispose()
          const list = Array.isArray(o.material) ? o.material : [o.material]
          for (const m of list) {
            m?.map?.dispose()
            m?.alphaMap?.dispose()
            m?.dispose()
          }
        })
        a.props.delete(name)
      }
    }, delay)
  }

  const drive = (el, fn) => {
    const a = state.locals.get(el) ?? state.actor
    if (a) a.driver = { el, fn }
  }

  window.deckActor = { stage, printStage, actor, parse, tour, prop, drive }
  window.deckLayers = [...(window.deckLayers ?? []), window.deckActor]
})()
