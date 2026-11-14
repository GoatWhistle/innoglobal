import { ACESFilmicToneMapping, Color, DirectionalLight, DoubleSide, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Raycaster, RingGeometry, Scene, Vector2, Vector3, WebGLRenderer } from 'three'
import { buildPipe } from '../pipeline/pipe.js'
import { createOil } from '../pipeline/oil.js'
import { createRig } from '../pipeline/rig.js'
import { curve, frame, DIM } from '../pipeline/route.js'
import { createStudio } from '../pipeline/studio.js'
import { createSurfaces } from '../pipeline/surface.js'
import { createTextures, disposeTextures } from '../pipeline/textures.js'

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
const axis = new Vector3(0,0,1)

export function createScannerEngine(canvas, { onSelect, onProject, onFailure }) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.toneMapping = ACESFilmicToneMapping
  const scene = new Scene(), camera = new PerspectiveCamera(26, 1, 0.1, 150)
  const studio = createStudio(renderer), textures = createTextures(), materials = createSurfaces(textures), oil = createOil()
  const pipe = buildPipe(materials, oil), rig = createRig(camera)
  const key = new DirectionalLight(0xffffff, 3)
  key.position.set(-3,12,6)
  scene.add(pipe.group, key, new HemisphereLight(0xffffff,0x333333,1.2))
  const scan = new Mesh(new RingGeometry(DIM.jacket+0.06,DIM.jacket+0.085,96),new MeshBasicMaterial({ side: DoubleSide, depthTest: false }))
  scan.renderOrder = 3
  const plane = new Mesh(new PlaneGeometry(2.25,2.25),new MeshBasicMaterial({ side: DoubleSide, transparent:true, opacity:0.07, depthWrite:false }))
  const hover = new Mesh(new RingGeometry(DIM.jacket+0.06,DIM.jacket+0.075,64),new MeshBasicMaterial({ side:DoubleSide,transparent:true,opacity:0.45,depthTest:false }))
  hover.visible = false
  scene.add(scan, plane, hover)
  const ray = new Raycaster(), pointer = new Vector2(), projected = new Vector3()
  let pipeline = null, chosen = 0, stopped = false, frameId = 0, last = performance.now(), orbiting = false, drag = null
  let width=1, height=1, dpr=Math.min(devicePixelRatio,1.5), costs=[], renders=0
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const events = new AbortController(), options={signal:events.signal}
  const position = (object, ratio) => {
    const f=frame(Math.max(0,Math.min(1,ratio)))
    object.position.copy(f.center); object.quaternion.setFromUnitVectors(axis,f.tangent)
  }
  function draw(now) {
    frameId=0
    if(stopped || document.hidden) return
    try {
      const start=performance.now(), dt=Math.min(0.05,(now-last)/1000); last=now
      const moving=rig.update(dt,0,reduced.matches)
      renderer.render(scene,camera); renders++
      projected.copy(scan.position).project(camera)
      onProject({x:(projected.x*0.5+0.5)*width,y:(-projected.y*0.5+0.5)*height})
      costs.push(performance.now()-start); if(costs.length>180) costs.shift()
      if(costs.length>=30 && costs.slice(-30).filter((x)=>x>33).length>15 && dpr>1) {dpr=1;renderer.setPixelRatio(dpr);renderer.setSize(width,height,false)}
      if(moving) request()
    } catch(error) { stopped=true; onFailure(error.message) }
  }
  function request() { if(!frameId && !stopped) frameId=requestAnimationFrame(draw) }
  function coordinate(event) {
    const r=canvas.getBoundingClientRect()
    pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1)
    ray.setFromCamera(pointer,camera)
    const hit=ray.intersectObjects(pipe.targets,false)[0]
    if(!hit) return null
    let best=0,distance=Infinity
    for(let i=0;i<=100;i++) { const d=curve.getPointAt(i/100).distanceToSquared(hit.point); if(d<distance){distance=d;best=i/100} }
    let a=Math.max(0,best-0.015),b=Math.min(1,best+0.015)
    for(let i=0;i<18;i++) {
      const l=a+(b-a)/3,r=b-(b-a)/3
      if(curve.getPointAt(l).distanceToSquared(hit.point)<curve.getPointAt(r).distanceToSquared(hit.point)) b=r
      else a=l
    }
    return (a+b)/2*pipeline.lengthM
  }
  canvas.addEventListener('pointerdown',(event)=>{
    if(!pipeline) return
    drag={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId)
    if(!orbiting) {const m=coordinate(event);if(m!==null)onSelect(m)}
  },options)
  canvas.addEventListener('pointermove',(event)=>{
    if(!pipeline) return
    if(drag && orbiting){rig.orbit(event.clientX-drag.x,event.clientY-drag.y);drag={x:event.clientX,y:event.clientY};request();return}
    const m=coordinate(event)
    if(drag && m!==null) onSelect(m)
    hover.visible=!drag && m!==null && !orbiting
    if(hover.visible)position(hover,m/pipeline.lengthM)
    request()
  },options)
  for(const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name,()=>{drag=null},options)
  canvas.addEventListener('pointerleave',()=>{hover.visible=false;request()},options)
  canvas.addEventListener('webglcontextlost',(event)=>{event.preventDefault();stopped=true;cancelAnimationFrame(frameId);onFailure('WebGL context lost')},options)
  document.addEventListener('visibilitychange',request,options)
  reduced.addEventListener('change',request,options)
  return {
    setData(data){pipeline=data;this.selectSegment(0)},
    selectSegment(id){chosen=id;const s=pipeline?.segments[id];scan.visible=plane.visible=Boolean(s);if(s){position(scan,(s.startM+s.endM)/2/pipeline.lengthM);plane.position.copy(scan.position);plane.quaternion.copy(scan.quaternion)}request()},
    setTheme(theme){const light=theme==='light';scene.background=new Color(token('--surface-base'));scene.environment=studio.environment(light);scene.environmentIntensity=light?1.1:0.85;oil.setTheme(light);for(const mesh of [scan,plane,hover])mesh.material.color.set(token('--text-primary'));request()},
    resize(w,h){width=Math.max(1,w);height=Math.max(1,h);renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);rig.fit(width,height);rig.update(0,0,true);request()},
    setOrbit(value){orbiting=value;canvas.style.cursor=value?'grab':'crosshair'},
    home(){rig.home();request()},
    stats(){const sorted=[...costs].sort((a,b)=>a-b);return {samples:costs.length,renderP95Ms:sorted[Math.floor(sorted.length*0.95)]??0,renders,dpr,selected:chosen,geometries:renderer.info.memory.geometries}},
    dispose(){stopped=true;cancelAnimationFrame(frameId);events.abort();for(const item of [pipe,materials,oil,studio])item.dispose();disposeTextures(textures);for(const mesh of [scan,plane,hover]){mesh.geometry.dispose();mesh.material.dispose()}renderer.dispose()},
  }
}
