import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Vector3 } from "three"

const GRAVITY = 5.2
const PACE = 0.55

export function createJet(limit = 3200) {
  const slots = limit + 12
  const position = new Float32Array(slots * 3), velocity = new Float32Array(slots * 3)
  const size = new Float32Array(slots), life = new Float32Array(slots), bounced = new Uint8Array(slots)
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new BufferAttribute(position, 3).setUsage(DynamicDrawUsage))
  geometry.setAttribute("aSize", new BufferAttribute(size, 1).setUsage(DynamicDrawUsage))
  geometry.setDrawRange(0, 0)
  const origin = new Vector3(), direction = new Vector3(), lateral = new Vector3(), impact = new Vector3(), lip = new Vector3()
  let alive = 0, emitting = false, started = 0, carry = 0, landed = false, seed = 7
  let power = 1, residue = 0, hang = 0, hanging = 0
  const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296 }
  function copy(to, from) {
    for (let k = 0; k < 3; k++) { position[to * 3 + k] = position[from * 3 + k]; velocity[to * 3 + k] = velocity[from * 3 + k] }
    size[to] = size[from]; life[to] = life[from]; bounced[to] = bounced[from]
  }
  function spawn(clock, lead) {
    if (alive >= limit) return
    const i = alive++
    const age = clock - started
    clock *= PACE
    const speed = 2.6 * (0.22 + 0.78 * power) * Math.min(1, 0.3 + age / 0.7) * (1 + 0.07 * Math.sin(clock * 8.3) + 0.04 * Math.sin(clock * 21.0)) * (0.99 + random() * 0.02)
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
    const neck = 0.82 + 0.18 * Math.sin(clock * 5.3 + phase) * Math.sin(clock * 1.7)
    size[i] = (loose ? 0.026 + random() * 0.02 : (0.046 + random() * 0.022) * neck) * (0.6 + 0.4 * Math.min(1, power)); life[i] = 5; bounced[i] = 0
  }
  const BLOB = [[0, 0, 0], [0.5, 0.2, 0], [-0.5, 0.2, 0], [0, 0.2, 0.5], [0, 0.2, -0.5], [0, -0.45, 0]]
  function blob(k, lead, r, spread) {
    for (const [dx, dy, dz] of BLOB) {
      lip.toArray(position, k * 3)
      position[k * 3] += dx * spread; position[k * 3 + 1] += dy * spread - lead; position[k * 3 + 2] += dz * spread
      size[k++] = r
    }
    return k
  }
  function release() {
    if (alive + BLOB.length + 1 > limit) return
    const first = alive
    alive = blob(alive, 0.08, 0.055, 0.035)
    alive = blob(alive, 0.02, 0.024, 0.01) - BLOB.length + 1
    for (let i = first; i < alive; i++) {
      velocity[i * 3] = 0; velocity[i * 3 + 1] = i === alive - 1 ? -0.1 : -0.35; velocity[i * 3 + 2] = 0
      life[i] = 3; bounced[i] = 0
    }
  }
  function drip(dt) {
    const level = emitting ? Math.max(0, 1 - power / 0.35) : residue
    if (!emitting) residue *= Math.exp(-dt / 1.9)
    if (level < 0.06 && hang === 0) { hanging = 0; return }
    hang += dt * (0.3 + 1.1 * level)
    if (hang >= 1) { release(); hang = level < 0.06 ? 0 : 0.001 }
    hanging = hang > 0 ? BLOB.length * 2 : 0
    blob(blob(alive, 0.015 + 0.01 * hang, 0.03, 0.006), 0.025 + 0.055 * hang, 0.03 + 0.03 * hang, 0.012 + 0.025 * hang)
  }
  return {
    geometry, impact,
    get alive() { return alive + hanging },
    get landed() { return landed },
    get emitting() { return emitting },
    get dripping() { return hanging > 0 || residue > 0.06 },
    setPower(k) { power = Math.max(0.05, Math.min(1.6, k)) },
    start(point, normal, tangent, clock) {
      origin.copy(point).addScaledVector(normal, -0.03)
      direction.copy(normal).addScaledVector(tangent, 0.5).normalize()
      lateral.copy(tangent)
      lip.copy(point).addScaledVector(normal, 0.015)
      impact.copy(point).setY(0)
      emitting = true; started = clock; carry = 0; landed = false; residue = 0; hang = 0
    },
    stop() { if (emitting) residue = 1; emitting = false },
    clear() { alive = 0; emitting = false; landed = false; residue = 0; hang = 0; hanging = 0; geometry.setDrawRange(0, 0) },
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
            const angle = random() * Math.PI * 2, kick = 0.3 + random() * 1.1
            velocity[i * 3] = velocity[i * 3] * 0.22 + Math.cos(angle) * kick
            velocity[i * 3 + 2] = velocity[i * 3 + 2] * 0.22 + Math.sin(angle) * kick
            velocity[i * 3 + 1] = Math.abs(velocity[i * 3 + 1]) * (0.06 + random() * 0.16)
            position[i * 3 + 1] = 0.03
            size[i] *= 0.4 + random() * 0.4; bounced[i] = 1; life[i] = 0.9
          } else dead = true
        }
        if (dead) { alive--; if (i < alive) copy(i, alive); i-- }
      }
      if (emitting) {
        carry += dt * 1100 * Math.min(1, Math.max(0, (power - 0.12) / 0.88)) ** 0.8
        const count = Math.floor(carry)
        carry -= count
        for (let n = 0; n < count; n++) spawn(clock, dt * (n + random()) / Math.max(1, count))
      }
      drip(dt)
      geometry.attributes.position.needsUpdate = true
      geometry.attributes.aSize.needsUpdate = true
      geometry.setDrawRange(0, alive + hanging)
    },
    dispose() { geometry.dispose() },
  }
}
