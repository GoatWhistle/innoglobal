import * as THREE from "three"
import { cylinder, makeLabel, oilFragment, vertex, wallFragment } from "./materials.js"
export function buildScene(host, name) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  })
  renderer.setClearColor(0, 0)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  host.append(renderer.domElement)
  renderer.domElement.setAttribute("aria-hidden", "true")
  const scene = new THREE.Scene(),
    camera = new THREE.OrthographicCamera(-6.5, 6.5, 2, -2, 0.1, 100)
  camera.position.set(0, 0, 18)
  camera.lookAt(0, 0, 0)
  const group = new THREE.Group()
  scene.add(group)
  scene.add(new THREE.HemisphereLight(0xdce8ef, 0x12100c, 2))
  const key = new THREE.DirectionalLight(0xffffff, 4)
  key.position.set(-2, 5, 6)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0x878f99, 2)
  fill.position.set(1, -3, 2)
  scene.add(fill)
  const damagePixels = new Uint8Array(2048 * 4)
  const damageMap = new THREE.DataTexture(damagePixels, 2048, 1)
  damageMap.needsUpdate = true
  damageMap.minFilter = THREE.LinearFilter
  damageMap.magFilter = THREE.LinearFilter
  function corrosionMap(rows, length) {
    damagePixels.fill(0)
    for (const row of rows) {
      if (row.priority_rank == null) continue
      const start = Math.floor((row.start_m / length) * 2047),
        end = Math.ceil((row.end_m / length) * 2047)
      for (let i = Math.max(0, start - 10); i <= Math.min(2047, end + 10); i++) {
        const distance = Math.max(start - i, i - end, 0)
        const value = Math.round(220 * Math.exp((-distance * distance) / 24))
        damagePixels[i * 4] = Math.max(damagePixels[i * 4], value)
        damagePixels[i * 4 + 3] = 255
      }
    }
    damageMap.needsUpdate = true
    host.dataset.corrosionCount = rows.filter((r) => r.priority_rank != null).length
  }
  const wallMat = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: wallFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    uniforms: {
      cut: { value: 0 },
      time: { value: 0 },
      damageMap: { value: damageMap },
      overviewDamage: { value: 0 },
      defectX: { value: 0 },
      corrosion: { value: 0 },
      rupture: { value: 0 },
    },
  })
  const wall = new THREE.Mesh(cylinder(0.72, 11.1), wallMat)
  wall.renderOrder = 3
  group.add(wall)
  const oilVertex = `varying vec3 p;varying vec3 n;uniform float time;uniform vec2 slosh;uniform float agitation;uniform float motionTime;uniform vec3 liquidUp;uniform float fillPlane;uniform float gravityEnabled;
void main(){vec3 pos=position;float radial=max(length(liquidUp.yz),.001);vec2 up=liquidUp.yz/radial;vec2 side=vec2(-up.y,up.x);float h=dot(pos.yz,up),w=dot(pos.yz,side);float level=clamp((fillPlane-liquidUp.x*pos.x)/radial,-.584,.584);float wave=sin(w*8.-motionTime*4.2+pos.x*.9)*.62+sin(w*13.+motionTime*3.2-pos.x*1.3)*.26+sin(pos.x*2.8-motionTime*2.7)*.12;float ripple=sin((pos.x-time*.85)*1.9+w*2.)*.017+sin((pos.x-time*.42)*3.1)*.007;float surface=level+slosh.x*w+slosh.y*sin(pos.x*.6)+agitation*wave+ripple;
if(gravityEnabled>.5){h=min(h,clamp(surface,-.584,.584));float breadth=sqrt(max(.585*.585-h*h,0.));w=clamp(w,-breadth,breadth);pos.yz=up*h+side*w;}else{pos.y+=ripple;}
p=pos;n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);}`
  const oilMat = new THREE.ShaderMaterial({
    vertexShader: oilVertex,
    fragmentShader: oilFragment,
    uniforms: {
      time: { value: 0 },
      slosh: { value: new THREE.Vector2() },
      agitation: { value: 0 },
      motionTime: { value: 0 },
      liquidUp: { value: new THREE.Vector3(0, 1, 0) },
      fillPlane: { value: 0.22 },
      gravityEnabled: { value: 1 },
    },
    side: THREE.DoubleSide,
  })
  const oilGeometry = new THREE.CylinderGeometry(0.585, 0.585, 11.09, 96, 100, false)
  oilGeometry.rotateZ(Math.PI / 2)
  const oil = new THREE.Mesh(oilGeometry, oilMat)
  oil.renderOrder = 1
  group.add(oil)
  const steel = new THREE.MeshStandardMaterial({
    color: 0x303a43,
    metalness: 0.72,
    roughness: 0.27,
  })
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x717d86,
    metalness: 0.8,
    roughness: 0.23,
  })
  const gasket = new THREE.MeshStandardMaterial({
    color: 0x0b1014,
    metalness: 0.25,
    roughness: 0.5,
  })
  const profile = [
    [0.63, -0.36],
    [0.73, -0.36],
    [0.77, -0.31],
    [0.77, -0.17],
    [0.86, -0.13],
    [0.89, -0.08],
    [0.89, 0.08],
    [0.86, 0.13],
    [0.77, 0.17],
    [0.77, 0.31],
    [0.73, 0.36],
    [0.63, 0.36],
    [0.63, -0.36],
  ]
  for (const x of [-5.37, 5.37]) {
    const flange = new THREE.Mesh(
      new THREE.LatheGeometry(
        profile.map(([r, y]) => new THREE.Vector2(r, y)),
        96,
      ),
      steel,
    )
    flange.rotation.z = Math.PI / 2
    flange.position.x = x
    group.add(flange)
    for (const dx of [-0.27, 0.27]) {
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.765, 0.012, 12, 96), edgeMat)
      lip.rotation.y = Math.PI / 2
      lip.position.x = x + dx
      group.add(lip)
    }
    const seal = new THREE.Mesh(cylinder(0.894, 0.034), gasket)
    seal.position.x = x
    group.add(seal)
    for (let j = 0; j < 10; j++) {
      const a = (j * Math.PI) / 5
      for (const dx of [-0.15, 0.15]) {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.09, 6), edgeMat)
        bolt.rotation.z = Math.PI / 2
        bolt.position.set(x + dx, Math.cos(a) * 0.816, Math.sin(a) * 0.816)
        group.add(bolt)
      }
    }
  }
  const glassEdge = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: wallFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: wallMat.uniforms,
  })
  const inner = new THREE.Mesh(cylinder(0.635, 10.8), glassEdge)
  inner.renderOrder = 2
  group.add(inner)
  for (const x of [-5.18, 5.18]) {
    const end = new THREE.Mesh(new THREE.RingGeometry(0.635, 0.72, 96), glassEdge)
    end.rotation.y = Math.PI / 2
    end.position.x = x
    end.renderOrder = 3
    group.add(end)
  }
  const label = makeLabel(name)
  group.add(label)
  const marker = new THREE.Mesh(
    new THREE.TorusGeometry(0.738, 0.009, 8, 128),
    new THREE.MeshBasicMaterial({ color: 0xf7f6f4, transparent: true, opacity: 0.95 }),
  )
  marker.rotation.y = Math.PI / 2
  group.add(marker)
  return { renderer, scene, camera, group, wallMat, oilMat, label, marker, damageMap, corrosionMap }
}
