import * as THREE from "three"

function phaseAt(t) {
  if (t < 1.4) return "approach"
  if (t < 4.2) return "corrosion"
  if (t < 5.9) return "opening"
  return "leak"
}
export function createInspection({
  host,
  group,
  camera,
  wallMat,
  label,
  marker,
  defectRoot,
  defectLip,
  stream,
  animateDischarge,
  reduced,
  onPhase,
  state,
}) {
  let inspectionElapsed = 0,
    inspectionPhase = ""
  const ease = (v) => 1 - (1 - Math.max(0, Math.min(1, v))) ** 3
  function clearInspection() {
    state.manualView = false
    state.inspection = null
    inspectionElapsed = 0
    inspectionPhase = ""
    host.dataset.inspection = "idle"
    defectRoot.visible = false
    if (marker) marker.visible = false
    label.visible = host.clientWidth >= 600
    wallMat.uniforms.corrosion.value = 0
    wallMat.uniforms.rupture.value = 0
    wallMat.uniforms.overviewDamage.value = 0
    camera.zoom = 1
    camera.position.set(0, 0, 18)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    onPhase("idle")
  }
  function startInspection(fraction) {
    clearInspection()
    const target = -4.4 + Math.max(0, Math.min(1, fraction)) * 8.8
    wallMat.uniforms.defectX.value = target
    defectRoot.position.x = target
    wallMat.uniforms.cut.value = 0
    if (marker) marker.visible = false
    label.visible = false
    state.inspection = { target, rotation: group.rotation.clone() }
    onPhase("approach")
  }
  function tickInspection(dt, time) {
    if (!state.inspection) {
      if (defectRoot.visible) animateDischarge(time, 1)
      return
    }
    if (state.inspection.manual) {
      animateDischarge(time, wallMat.uniforms.rupture.value)
      return
    }
    inspectionElapsed += dt
    const t = reduced.matches ? 6.8 : inspectionElapsed,
      a = ease(t / 1.4),
      close = ease((t - 2.2) / 2),
      opening = ease((t - 4.5) / 1.4)
    group.rotation.set(
      THREE.MathUtils.lerp(state.inspection.rotation.x, -1.15, a),
      THREE.MathUtils.lerp(state.inspection.rotation.y, 0, a),
      THREE.MathUtils.lerp(state.inspection.rotation.z, 0, a),
    )
    const zoom = 1 + close * 1.7,
      cameraX = state.inspection.target * close,
      cameraY = -0.12 * a - 0.65 * close
    camera.zoom = zoom
    camera.position.set(cameraX, cameraY, 18)
    camera.lookAt(cameraX, cameraY, 0)
    camera.updateProjectionMatrix()
    wallMat.uniforms.overviewDamage.value = 1 - close * 0.86
    wallMat.uniforms.corrosion.value = 0.65 + 0.35 * a
    wallMat.uniforms.rupture.value = opening
    defectRoot.visible = t > 4.5
    defectLip.scale.set(opening, 1, opening)
    stream.visible = t > 4.55
    animateDischarge(time, opening)
    const phase = phaseAt(t)
    if (phase !== inspectionPhase) {
      inspectionPhase = phase
      host.dataset.inspection = phase
      onPhase(phase)
    }
  }
  return { clearInspection, startInspection, tickInspection }
}
