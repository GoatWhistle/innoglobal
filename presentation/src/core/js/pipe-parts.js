window.diagParts = (() => {
  const mats = (THREE) => ({
    steel: new THREE.MeshStandardMaterial({ color: deckPipes.color("--ink-200"), metalness: 0.85, roughness: 0.28 }),
    dark: new THREE.MeshStandardMaterial({ color: deckPipes.color("--ink-800"), metalness: 0.5, roughness: 0.45 }),
    rubber: new THREE.MeshStandardMaterial({ color: deckPipes.color("--ink-700"), metalness: 0.05, roughness: 0.8 }),
    accent: new THREE.MeshStandardMaterial({
      color: deckPipes.color("--brand-accent"),
      emissive: deckPipes.color("--brand-accent"),
      emissiveIntensity: 0.6,
      metalness: 0.2,
      roughness: 0.4,
    }),
    glow: new THREE.MeshBasicMaterial({
      color: deckPipes.color("--brand-accent"),
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  })

  const along = (geometry) => geometry.rotateZ(Math.PI / 2)

  const ring = (THREE, parent, count, radius, x, make) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      const mesh = make(a, i)
      mesh.position.set(x, Math.cos(a) * radius, Math.sin(a) * radius)
      mesh.rotation.x = -a
      parent.add(mesh)
    }
  }

  const pig = (THREE, parent) => {
    const m = mats(THREE)
    const root = new THREE.Group()
    const cup = (x, r = 0.64) => {
      const mesh = new THREE.Mesh(along(new THREE.CylinderGeometry(r - 0.03, r, 0.07, 72)), m.rubber)
      mesh.position.x = x
      root.add(mesh)
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r - 0.015, 0.018, 8, 72), m.dark)
      rim.rotation.y = Math.PI / 2
      rim.position.x = x
      root.add(rim)
    }
    const body = (x, len, r) => {
      const mesh = new THREE.Mesh(along(new THREE.CylinderGeometry(r, r, len, 48)), m.steel)
      mesh.position.x = x
      root.add(mesh)
      for (const end of [-len / 2, len / 2]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 8, 48), m.dark)
        band.rotation.y = Math.PI / 2
        band.position.x = x + end
        root.add(band)
      }
    }
    body(0.5, 1.15, 0.27)
    cup(1.02)
    cup(0.88)
    for (const x of [0.22, 0.78]) {
      const magnet = new THREE.Mesh(along(new THREE.CylinderGeometry(0.5, 0.5, 0.14, 48)), m.dark)
      magnet.position.x = x
      root.add(magnet)
      ring(THREE, root, 40, 0.58, x, () => new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.022), m.steel))
    }
    ring(THREE, root, 20, 0.6, 0.5, () => new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.12), m.accent))
    const scan = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.03, 12, 96), m.glow)
    scan.rotation.y = Math.PI / 2
    scan.position.x = 0.5
    root.add(scan)
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.34, 48).rotateZ(-Math.PI / 2), m.steel)
    nose.position.x = 1.25
    root.add(nose)
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 8, 24), m.dark)
    eye.position.x = 1.45
    root.add(eye)
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), m.dark)
    joint.position.x = -0.18
    root.add(joint)
    body(-0.72, 0.8, 0.24)
    cup(-0.36, 0.62)
    cup(-1.08, 0.62)
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.03), m.dark)
      arm.position.set(-0.86, Math.cos(a) * 0.42, Math.sin(a) * 0.42)
      arm.rotation.x = -a
      arm.rotation.z = 0.9
      root.add(arm)
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 24), m.dark)
      wheel.position.set(-0.96, Math.cos(a) * 0.585, Math.sin(a) * 0.585)
      wheel.rotation.x = -a
      wheel.rotateZ(Math.PI / 2)
      wheel.rotateX(Math.PI / 2)
      root.add(wheel)
    }
    parent.add(root)
    return { root, scan }
  }

  const probe = (THREE, parent, x, dir, wall = 0.72) => {
    const m = mats(THREE)
    const root = new THREE.Group()
    const head = new THREE.Group()
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 32), m.accent)
    face.position.y = 0.015
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.2, 32), m.dark)
    housing.position.y = 0.13
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 8, 32), m.steel)
    collar.rotation.x = Math.PI / 2
    collar.position.y = 0.23
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.06, 32), m.steel)
    cap.position.y = 0.26
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.45, 12), m.dark)
    cable.position.y = 0.515
    head.add(face, housing, collar, cap, cable)
    root.add(head)
    const pulse = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.135, 48), m.glow.clone())
    pulse.rotation.x = -Math.PI / 2
    pulse.position.y = 0.004
    pulse.material.side = THREE.DoubleSide
    pulse.material.opacity = 0
    root.add(pulse)
    const radial = Math.hypot(dir.y, dir.z) || 1
    root.position.set(x, (wall * dir.y) / radial, (wall * dir.z) / radial)
    root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    parent.add(root)
    return { root, head, pulse, x }
  }

  const toLocal = (THREE, el, world) => {
    const pose = deckActor.parse(el.dataset.pipe)
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.rx, pose.ry, pose.rz))
    return world.clone().applyQuaternion(q.invert()).normalize()
  }

  const reset = (el, extras) => {
    el._run = (el._run || 0) + 1
    for (const child of [...extras.children]) {
      extras.remove(child)
      child.traverse((o) => {
        o.geometry?.dispose()
        const list = Array.isArray(o.material) ? o.material : [o.material]
        for (const m of list) m?.dispose()
      })
    }
    return el._run
  }

  return { pig, probe, toLocal, reset }
})()
