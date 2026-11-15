import * as THREE from "three"
export function createLiquid({ host, group, camera, oilMat, state, reduced }) {
  const liquidUp = new THREE.Vector3(0, 1, 0),
    targetUp = new THREE.Vector3(),
    inverseRotation = new THREE.Quaternion()
  let framed = false
  function frameCamera(dt) {
    const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(group.quaternion),
      extentY = Math.abs(axis.y) * 5.6 + 1.1,
      extentX = Math.abs(axis.x) * 5.6 + 1.1
    const fit = Math.min(
      1,
      ((camera.top - camera.bottom) * 0.46) / extentY,
      ((camera.right - camera.left) * 0.46) / extentX,
    )
    camera.zoom = framed ? THREE.MathUtils.lerp(camera.zoom, fit, 1 - Math.exp(-dt * 8)) : fit
    framed = true
    camera.updateProjectionMatrix()
  }
  function updateLiquid(dt) {
    if (!state.inspection && !state.manualView) frameCamera(dt)
    inverseRotation.copy(group.quaternion).invert()
    targetUp.set(0, 1, 0).applyQuaternion(inverseRotation)
    liquidUp.lerp(targetUp, 1 - Math.exp(-dt * 5)).normalize()
    const radial = Math.max(Math.hypot(liquidUp.y, liquidUp.z), 0.001)
    let lo = -6,
      hi = 6
    const area = (h) => {
      const v = Math.max(-1, Math.min(1, h / 0.585))
      return (Math.asin(v) + v * Math.sqrt(1 - v * v) + Math.PI / 2) / Math.PI
    }
    for (let j = 0; j < 18; j++) {
      const mid = (lo + hi) / 2
      let volume = 0
      for (let i = 0; i < 32; i++)
        volume += area((mid - liquidUp.x * ((i + 0.5) / 32 - 0.5) * 11.09) / radial)
      if (volume / 32 < area(state.level ?? 0.22)) lo = mid
      else hi = mid
    }
    oilMat.uniforms.liquidUp.value.copy(liquidUp)
    const fill = state.fill ?? 1
    oilMat.uniforms.fillPlane.value = -0.7 + ((lo + hi) / 2 + 0.7) * fill
    host.dataset.liquidUp = liquidUp
      .toArray()
      .map((v) => v.toFixed(3))
      .join(",")
  }
  let agitation = 0,
    motionTime = 0
  const slosh = new THREE.Vector2(),
    sloshVelocity = new THREE.Vector2()
  function impulse(dx, dy) {
    if (reduced.matches) return
    agitation = Math.min(0.23, agitation + Math.hypot(dx, dy) * 0.006)
    sloshVelocity.x += Math.max(-0.7, Math.min(0.7, dy * 0.015))
    sloshVelocity.y += Math.max(-0.5, Math.min(0.5, dx * 0.009))
  }
  function advance(delta) {
    sloshVelocity.addScaledVector(slosh, -24 * delta).multiplyScalar(Math.exp(-4.8 * delta))
    slosh.addScaledVector(sloshVelocity, delta)
    slosh.clampScalar(-0.16, 0.16)
    motionTime += delta
    agitation *= Math.exp(-0.85 * delta)
    oilMat.uniforms.agitation.value = agitation
    oilMat.uniforms.motionTime.value = motionTime
    oilMat.uniforms.slosh.value.copy(slosh)
    host.dataset.agitation = agitation.toFixed(5)
    host.dataset.slosh = slosh.length().toFixed(5)
  }
  return { updateLiquid, impulse, advance }
}
