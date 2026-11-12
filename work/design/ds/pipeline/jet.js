import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Vector3 } from "three"

const GRAVITY = 9.2

export function createJet(limit = 3200) {
  const position = new Float32Array(limit * 3), velocity = new Float32Array(limit * 3)
  const size = new Float32Array(limit), life = new Float32Array(limit), bounced = new Uint8Array(limit)
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new BufferAttribute(position, 3).setUsage(DynamicDrawUsage))
  geometry.setAttribute("aSize", new BufferAttribute(size, 1).setUsage(DynamicDrawUsage))
  geometry.setDrawRange(0, 0)
  const origin = new Vector3(), direction = new Vector3(), lateral = new Vector3(), impact = new Vector3()
  let alive = 0, emitting = false, started = 0, carry = 0, landed = false, seed = 7
  const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296 }
  function copy(to, from) {
    for (let k = 0; k < 3; k++) { position[to * 3 + k] = position[from * 3 + k]; velocity[to * 3 + k] = velocity[from * 3 + k] }
    size[to] = size[from]; life[to] = life[from]; bounced[to] = bounced[from]
  }
  function spawn(clock, lead) {
    if (alive >= limit) return
    const i = alive++
    const age = clock - started
    const speed = 4.6 * Math.min(1, 0.3 + age / 0.7) * (1 + 0.07 * Math.sin(clock * 8.3) + 0.04 * Math.sin(clock * 21.0)) * (0.99 + random() * 0.02)
    const strand = Math.floor(random() * 6), loose = random() < 0.07
    const phase = strand * 1.9
    const wide = loose ? 0.2 : 0.02
    const sway = Math.sin(clock * (2.1 + strand * 0.37) + phase) * 0.17 + Math.sin(clock * 7.3 + phase * 2.0) * 0.03 + (random() - 0.5) * wide
    const lift = Math.sin(clock * (2.6 + strand * 0.29) + phase * 1.7) * 0.11 + Math.sin(clock * 9.1 + phase) * 0.025 + (random() - 0.5) * wide
    const v = direction.clone().addScaledVector(lateral, sway).add(new Vector3(0, lift, 0)).normalize().multiplyScalar(speed * (loose ? 0.8 + random() * 0.35 : 1 - strand * 0.022))
    const p = origin.clone().addScaledVector(v, lead).addScaledVector(lateral, (random() - 0.5) * 0.09)
    p.y += (random() - 0.5) * 0.07 - 0.5 * GRAVITY * lead * lead
    v.y -= GRAVITY * lead
    p.toArray(position, i * 3); v.toArray(velocity, i * 3)
    size[i] = loose ? 0.026 + random() * 0.02 : 0.046 + random() * 0.022; life[i] = 3; bounced[i] = 0
  }
  return {
    geometry, impact,
    get alive() { return alive },
    get landed() { return landed },
    get emitting() { return emitting },
    start(point, normal, tangent, clock) {
      origin.copy(point).addScaledVector(normal, -0.03)
      direction.copy(normal).addScaledVector(tangent, 0.5).normalize()
      lateral.copy(tangent)
      impact.copy(point).setY(0)
      emitting = true; started = clock; carry = 0; landed = false
    },
    stop() { emitting = false },
    clear() { alive = 0; emitting = false; landed = false; geometry.setDrawRange(0, 0) },
    update(dt, clock) {
      for (let i = 0; i < alive; i++) {
        velocity[i * 3 + 1] -= GRAVITY * dt
        for (let k = 0; k < 3; k++) position[i * 3 + k] += velocity[i * 3 + k] * dt
        life[i] -= dt
        let dead = life[i] <= 0
        if (position[i * 3 + 1] < 0.03 && !dead) {
          if (!bounced[i]) {
            impact.x += (position[i * 3] - impact.x) * 0.04
            impact.z += (position[i * 3 + 2] - impact.z) * 0.04
            landed = true
          }
          if (!bounced[i] && random() < 0.42) {
            const angle = random() * Math.PI * 2, kick = 0.6 + random() * 2.3
            velocity[i * 3] = velocity[i * 3] * 0.22 + Math.cos(angle) * kick
            velocity[i * 3 + 2] = velocity[i * 3 + 2] * 0.22 + Math.sin(angle) * kick
            velocity[i * 3 + 1] = Math.abs(velocity[i * 3 + 1]) * (0.12 + random() * 0.33)
            position[i * 3 + 1] = 0.03
            size[i] *= 0.4 + random() * 0.4; bounced[i] = 1; life[i] = 0.9
          } else dead = true
        }
        if (dead) { alive--; if (i < alive) copy(i, alive); i-- }
      }
      if (emitting) {
        carry += dt * 1500
        const count = Math.floor(carry)
        carry -= count
        for (let n = 0; n < count; n++) spawn(clock, dt * (n + random()) / Math.max(1, count))
      }
      geometry.attributes.position.needsUpdate = true
      geometry.attributes.aSize.needsUpdate = true
      geometry.setDrawRange(0, alive)
    },
    dispose() { geometry.dispose() },
  }
}
