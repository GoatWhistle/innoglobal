import { surface } from "./route.js"

const BASE_HOLE_MM = 25

export function createLeak({ surfaces, jet, puddle, rig, holeMm = BASE_HOLE_MM }) {
  const hole = surfaces.uniforms
  const scale = Math.max(0.2, Math.min(2, holeMm / BASE_HOLE_MM))
  let key = null, landed = null, ended = null, volume = 0, wet = 0, power = 0, peak = 0, framed = false
  function clear() {
    hole.uHole.value.set(1e4, 0, 0)
    hole.uWet.value = 0
    puddle.mesh.visible = false
    puddle.uniforms.uGrow.value = 0
    puddle.uniforms.uStir.value = 0
    jet.clear()
    key = null; landed = null; ended = null; volume = 0; wet = 0; power = 0; framed = false
  }
  function intensity(sim) {
    if (!sim.leak) return 0
    const [before, after] = sim.flowShare?.() ?? [1, 1]
    return Math.max(0, Math.min(1, (before - after) / 0.12)) * scale
  }
  return {
    get active() { return key !== null },
    get power() { return power },
    update(sim, wall, clock, dt, reduced) {
      if (sim.leak && sim.leak.t0 !== key) {
        clear()
        const at = surface(sim.leak.x)
        hole.uHole.value.copy(at.position)
        hole.uHoleN.value.copy(at.normal)
        hole.uHoleT.value.copy(at.tangent)
        hole.uHoleR.value = 0.125 * Math.sqrt(scale)
        hole.uWetFade.value = 1
        jet.setPower(Math.max(0.05, intensity(sim)))
        jet.start(at.position, at.normal, at.tangent, reduced ? 0 : clock)
        puddle.uniforms.uSeed.value = sim.leak.x * 0.001
        puddle.uniforms.uFade.value = 1
        puddle.mesh.position.set(at.position.x + at.normal.x * 1.7 + at.tangent.x * 0.9, puddle.mesh.position.y, at.position.z + at.normal.z * 1.7 + at.tangent.z * 0.9)
        rig.focus(at.position)
        key = sim.leak.t0; framed = true
        if (reduced) { jet.setPower(scale); for (let i = 0; i < 90; i++) jet.update(1 / 60, 2 + i / 60); volume = 6 * scale; wet = 1.5 }
      }
      if (!sim.leak && key !== null && ended === null) { ended = wall; peak = power }
      if (key === null) return
      const taper = ended === null ? 1 : Math.max(0, 1 - (wall - ended) / 1.4)
      power = ended === null ? intensity(sim) : peak * taper
      jet.setPower(power)
      if (ended !== null && (taper === 0 || reduced) && jet.emitting) jet.stop()
      if (!reduced) jet.update(dt, clock)
      else if (ended !== null) jet.clear()
      if (framed && ended !== null && !jet.dripping) { framed = false; rig.focus(null) }
      const flowing = jet.emitting ? power : jet.dripping ? 0.04 : 0
      if (!reduced) wet = Math.min(1.5, wet + dt * 0.55 * Math.min(1, 0.25 + flowing))
      hole.uWet.value = wet
      if (landed === null && (jet.landed || reduced)) landed = wall
      if (landed === null) return
      if (!reduced) volume += flowing * dt
      puddle.mesh.visible = true
      if (wall - landed < 2.5 && jet.landed && ended === null) { puddle.mesh.position.x = jet.impact.x; puddle.mesh.position.z = jet.impact.z }
      puddle.uniforms.uGrow.value = Math.min(1, (wall - landed) / 0.5) * Math.min(2.6, 0.18 + 0.66 * Math.sqrt(volume))
      puddle.uniforms.uTime.value = clock
      const stir = reduced ? 0 : Math.min(1, flowing * 1.4)
      puddle.uniforms.uStir.value += (stir - puddle.uniforms.uStir.value) * Math.min(1, dt * (stir > puddle.uniforms.uStir.value ? 6 : 0.8))
    },
  }
}
