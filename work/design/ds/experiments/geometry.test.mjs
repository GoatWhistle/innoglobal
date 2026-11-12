import assert from "node:assert/strict"
import { test } from "node:test"
import { PerspectiveCamera, Raycaster, Vector3 } from "three"
import { buildObject } from "./geometry.js"
import { toMeters, VARIANTS } from "./paths.js"

for (const id of Object.keys(VARIANTS)) {
  test(`${id}: ray picking follows the curved pipeline coordinate`, () => {
    const object = buildObject(id)
    const camera = new PerspectiveCamera(30, 2, 0.1, 200)
    camera.position.set(...object.config.camera).multiplyScalar(3)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
    object.group.updateMatrixWorld(true)
    for (const meters of [800, 3600, 6330, 9800, 11200]) {
      const point = object.surface(meters, camera).position
      const ray = new Raycaster(camera.position, point.clone().sub(camera.position).normalize())
      const hit = ray.intersectObjects([object.body, object.liquid], false)[0]
      assert.ok(hit)
      assert.ok(Math.abs(toMeters(hit.uv.x) - meters) < 120, `${id}: ${meters} became ${toMeters(hit.uv.x)}`)
    }
    object.dispose()
  })
  test(`${id}: all geometries and materials release on variant disposal`, () => {
    const object = buildObject(id)
    let resources = 0, released = 0
    object.group.traverse((node) => {
      for (const resource of [node.geometry, node.material].filter(Boolean)) {
        resources++
        resource.addEventListener("dispose", () => released++)
      }
    })
    object.dispose()
    assert.equal(released, resources)
    assert.equal(resources, 16)
  })
  test(`${id}: oil fills the pipe and flow tangents follow its axis`, () => {
    const object = buildObject(id)
    const geometry = object.liquid.geometry
    const position = geometry.attributes.position, axis = geometry.attributes.aFlow, uv = geometry.attributes.uv
    for (let i = 0; i < position.count; i += 49) {
      const center = object.curve.getPointAt(uv.getX(i))
      const point = new Vector3().fromBufferAttribute(position, i)
      assert.ok(Math.abs(point.distanceTo(center) - object.config.radius * 0.965) < 0.001)
      assert.ok(new Vector3().fromBufferAttribute(axis, i).dot(object.curve.getTangentAt(uv.getX(i))) > 0.999)
    }
    object.dispose()
  })
}
