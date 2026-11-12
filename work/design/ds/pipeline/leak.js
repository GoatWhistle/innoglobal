import { surface } from "./route.js"

export function createLeak({ surfaces, jet, puddle, rig }) {
  const hole = surfaces.uniforms
  let key = null, begun = 0, landed = null, ended = null, fade = 1
  function clear() {
    hole.uHole.value.set(1e4, 0, 0)
    hole.uWet.value = 0
    puddle.mesh.visible = false
    puddle.uniforms.uGrow.value = 0
    jet.clear()
    key = null; landed = null; ended = null; fade = 1
  }
  return {
    get fade() { return fade },
    get active() { return key !== null },
    update(sim, wall, clock, dt, reduced) {
      if (sim.leak && sim.leak.t0 !== key) {
        clear()
        const at = surface(sim.leak.x)
        hole.uHole.value.copy(at.position)
        hole.uHoleN.value.copy(at.normal)
        hole.uHoleT.value.copy(at.tangent)
        hole.uWetFade.value = 1
        jet.start(at.position, at.normal, at.tangent, reduced ? 0 : clock)
        puddle.uniforms.uSeed.value = sim.leak.x * 0.001
        puddle.uniforms.uFade.value = 1
        puddle.mesh.position.set(at.position.x + at.normal.x * 1.7 + at.tangent.x * 0.9, puddle.mesh.position.y, at.position.z + at.normal.z * 1.7 + at.tangent.z * 0.9)
        rig.focus(at.position)
        key = sim.leak.t0; begun = wall
        if (reduced) for (let i = 0; i < 90; i++) jet.update(1 / 60, 2 + i / 60)
      }
      if (!sim.leak && key !== null && ended === null) { ended = wall; jet.stop(); rig.focus(null) }
      if (key === null) return
      const age = wall - begun
      hole.uWet.value = reduced ? 1.5 : Math.min(1.5, age * 0.55)
      if (!reduced) jet.update(dt, clock)
      else if (ended !== null) jet.clear()
      if (landed === null && (jet.landed || reduced)) landed = wall
      if (landed !== null) {
        const t = wall - landed
        puddle.mesh.visible = true
        if (t < 2.5 && jet.landed) { puddle.mesh.position.x = jet.impact.x; puddle.mesh.position.z = jet.impact.z }
        puddle.uniforms.uGrow.value = reduced ? 1.8 : Math.min(1, t / 0.5) * (0.5 + 1.7 * (1 - Math.exp(-t / 6)))
        puddle.uniforms.uTime.value = clock
        puddle.uniforms.uStir.value = jet.emitting && !reduced ? 1 : Math.max(0, puddle.uniforms.uStir.value - dt)
      }
      if (ended !== null) {
        fade = reduced ? 0 : Math.max(0, 1 - (wall - ended) / 1.1)
        hole.uWetFade.value = fade
        puddle.uniforms.uFade.value = fade
        if (fade === 0) clear()
      }
    },
  }
}
