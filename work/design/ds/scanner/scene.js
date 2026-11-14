import { number, range } from './format.js'

export function mountScene(host, store) {
  const canvas=host.querySelector('canvas'), fallback=host.querySelector('[data-fallback]'), label=host.querySelector('[data-scan-label]')
  let engine=null,current=null,failed=false
  const fail=()=>{failed=true;host.dataset.renderer='fallback';host.querySelector('[data-render-state]').textContent='2D-схема. Выбор сегментов доступен.'}
  function attach(createScannerEngine) {
  try {
    if(new URLSearchParams(location.search).get('state')==='nogl') fail()
    else {failed=false;engine=createScannerEngine(canvas,{
      onSelect:(meters)=>store.at(meters),onFailure:fail,
      onProject:({x,y})=>{label.style.transform=`translate(${Math.max(80,Math.min(host.clientWidth-80,x))}px, ${Math.max(40,y-85)}px) translateX(-50%)`},
    })}
  } catch {fail()}
  if(engine){engine.setData(store.snapshot().pipeline);engine.selectSegment(store.snapshot().selected)}
  theme();resize()
  if(!failed && engine){host.dataset.renderer='ready';host.querySelector('[data-render-state]').textContent='Продольный масштаб условный'}
  }
  const fallbackSelect=(e)=>{const r=fallback.getBoundingClientRect();store.at((e.clientX-r.left-24)/(r.width-48)*store.snapshot().pipeline.lengthM)}
  fallback.addEventListener('click',fallbackSelect)
  const unsubscribe=store.subscribe((state)=>{
    const {pipeline,segment}=state
    if(current!==pipeline){current=pipeline;engine?.setData(pipeline)}
    engine?.selectSegment(state.selected)
    label.textContent=segment?range(segment):''
    const fraction=segment?(segment.startM+segment.endM)/2/pipeline.lengthM:0
    fallback.innerHTML=`<svg viewBox="0 0 800 220" aria-hidden="true"><path d="M24 83H776V137H24Z" class="wall-outline"/><path d="M24 110H776" class="wall-axis"/><path d="M${24+fraction*752} 55V165" class="plot-cursor"/><text x="24" y="190">0 м</text><text x="776" y="190" text-anchor="end">${number(pipeline.lengthM)} м</text></svg>`
  })
  const resize=()=>{engine?.resize(host.clientWidth,host.clientHeight)}
  const observer=new ResizeObserver(resize);observer.observe(host)
  const theme=()=>engine?.setTheme(document.documentElement.dataset.theme)
  document.addEventListener('theme:change',theme)
  const ready=(event)=>attach(event.detail)
  document.addEventListener('scanner:renderer-ready',ready,{once:true})
  if(window.scannerEngineFactory) attach(window.scannerEngineFactory)
  else fail()
  return { setOrbit:(v)=>engine?.setOrbit(v),home:()=>engine?.home(),stats:()=>engine?.stats(),dispose(){document.removeEventListener('scanner:renderer-ready',ready);unsubscribe();observer.disconnect();document.removeEventListener('theme:change',theme);engine?.dispose()} }
}
