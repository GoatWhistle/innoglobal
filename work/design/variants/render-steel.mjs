import fs from 'node:fs/promises'
import { chromium } from '../../../frontend/node_modules/playwright-core/index.mjs'
const browser = await chromium.launch({headless:true})
const page = await browser.newPage()
await page.goto('http://localhost:5179/design/variants/scanner')
const data = await page.evaluate(async () => {
  const THREE = await import('/node_modules/.vite/deps/three.js')
  const { createTextures } = await import('/src/features/pipe-scene/engine/textures.js')
  const maps = createTextures().steel
  const renderer = new THREE.WebGLRenderer({alpha:true, antialias:true, preserveDrawingBuffer:true})
  renderer.setSize(2048, 441)
  renderer.setClearColor(0, 0)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.85
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-6.5,6.5,1,-1.8,0.1,100)
  camera.position.set(0,0,20)
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1,1,13,96,1),new THREE.MeshStandardMaterial({map:maps.color,normalMap:maps.normal,roughnessMap:maps.surface,roughness:0.65,metalness:0.55}))
  mesh.rotation.z = Math.PI/2
  scene.add(mesh,new THREE.AmbientLight(0xffffff,0.75))
  const key = new THREE.DirectionalLight(0xffffff,1.8)
  key.position.set(-2,5,5)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xe4e8ed,0.25)
  fill.position.set(0,-3,2)
  scene.add(fill)
  const weld = new THREE.MeshStandardMaterial({color:0x777c80, metalness:0.65, roughness:0.7, normalMap:maps.normal})
  for (const x of [-5.2,-3.9,-2.6,-1.3,0,1.3,2.6,3.9,5.2]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1,0.018,12,96),weld)
    ring.rotation.y = Math.PI/2
    ring.position.x = x
    scene.add(ring)
  }
  const support = new THREE.MeshStandardMaterial({color:0x454b51,metalness:0.35,roughness:0.7,normalMap:maps.normal})
  for (const x of [-5.2,-2.6,0,2.6,5.2]) {
    for (const [w,h,d,y] of [[0.2,0.6,0.65,-1.2],[0.8,0.1,0.9,-1.55],[0.55,0.15,0.85,-0.92]]) {
      const part = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),support)
      part.position.set(x,y,0)
      scene.add(part)
    }
  }
  renderer.render(scene,camera)
  const result = renderer.domElement.toDataURL('image/png').split(',')[1]
  renderer.dispose()
  return result
})
await fs.writeFile('work/design/variants/assets/steel-elevation.png',Buffer.from(data,'base64'))
await browser.close()
