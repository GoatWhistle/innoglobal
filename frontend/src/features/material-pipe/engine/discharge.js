import * as THREE from "three"
import { oilFragment } from "./materials.js"
export function createDischarge(group) {
  const defectRoot = new THREE.Group()
  group.add(defectRoot)
  defectRoot.visible = false
  const outline = []
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2,
      r = 1 + 0.06 * Math.sin(a * 7) + 0.035 * Math.cos(a * 11),
      z = 0.14 * Math.sin(a) * r
    outline.push(new THREE.Vector3(0.25 * Math.cos(a) * r, -Math.sqrt(0.72 * 0.72 - z * z), z))
  }
  const defectLip = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outline, true), 96, 0.004, 8, true),
    new THREE.MeshStandardMaterial({ color: 0x282720, metalness: 0.65, roughness: 0.4 }),
  )
  defectRoot.add(defectLip)
  const discharge = new THREE.Group()
  defectRoot.add(discharge)
  discharge.position.set(0, -0.69, 0)
  const streamMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec3 p;varying vec3 n;void main(){p=vec3(-position.y*1.6,position.x,position.z);n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: oilFragment,
    side: THREE.DoubleSide,
  })
  const meniscus = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), streamMaterial)
  meniscus.scale.set(0.115, 0.15, 0.105)
  meniscus.renderOrder = 4
  discharge.add(meniscus)
  const streamGeometry = new THREE.CylinderGeometry(1, 1, 1, 24, 72, true)
  const stream = new THREE.Mesh(streamGeometry, streamMaterial)
  stream.renderOrder = 4
  discharge.add(stream)
  const streamBase = streamGeometry.attributes.position.array.slice()
  const streamPoints = streamGeometry.attributes.position
  const drops = []
  for (let i = 0; i < 7; i++) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.026 + i * 0.002, 16, 12), streamMaterial)
    drop.renderOrder = 4
    discharge.add(drop)
    drops.push(drop)
  }
  const outletNormal = new THREE.Vector3()
  function animateDischarge(time, opening) {
    streamMaterial.uniforms.time.value = time
    meniscus.scale.set(
      0.115 * Math.max(0.02, opening),
      0.15 * Math.max(0.02, opening),
      0.105 * Math.max(0.02, opening),
    )
    discharge.quaternion.copy(group.quaternion).invert()
    outletNormal.set(0, -1, 0).applyQuaternion(group.quaternion)
    const length = 3.8
    for (let i = 0; i < streamPoints.count; i++) {
      const x = streamBase[i * 3],
        u = 0.5 - streamBase[i * 3 + 1],
        z = streamBase[i * 3 + 2],
        speed = Math.sqrt(1 + u * 7),
        pulse = 1 + 0.12 * Math.sin(u * 19 - time * 4.5) + 0.055 * Math.sin(u * 37 - time * 7.3),
        radius = (0.083 / Math.sqrt(speed)) * (1 - 0.38 * u) * pulse * Math.max(0.08, opening),
        neck = 1 - 0.28 * Math.sin(u * 11 - time * 3.2) ** 8 * u
      const bend = 0.035 * u * u * Math.sin(time * 1.1 - u * 3)
      const exit = -0.13 + 0.28 * (1 - Math.exp(-u * 14))
      streamPoints.setXYZ(
        i,
        x * radius * neck + bend + outletNormal.x * exit,
        -u * length + outletNormal.y * exit,
        z * radius * (1 + 0.15 * Math.sin(u * 13 - time * 2.3)) + outletNormal.z * exit,
      )
    }
    streamPoints.needsUpdate = true
    streamGeometry.computeVertexNormals()
    for (let i = 0; i < drops.length; i++) {
      const age = (time * 0.65 + i * 0.143) % 1,
        drop = drops[i]
      drop.position.set(
        0.02 * Math.sin(i * 2.7) + 0.035 * age,
        -2.5 - age * 0.5 - age * age * 1.8,
        0.025 * Math.cos(i * 3.1),
      )
      drop.scale.set(0.8, 1.25 + age * 0.9, 0.8)
      drop.visible = opening > 0.2
    }
  }
  return { defectRoot, defectLip, stream, animateDischarge }
}
