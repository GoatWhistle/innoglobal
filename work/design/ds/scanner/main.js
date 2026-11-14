import { segmented } from '../kit-controls.js'
import { readTheme } from '../kit-theme.js'
import { icon, number } from './format.js'
import { bindPlot, renderPlot } from './plot.js'
import { mountScene } from './scene.js'
import { createStore } from './state.js'
import { createView } from './view.js'

const params=new URLSearchParams(location.search)
const store=createStore(params.get('case')==='2'?2:1,params.get('state')??'ready')
const root=document.querySelector('#main'),q=(s)=>document.querySelector(s)
const pipelines=q('[data-pipelines]')
for(const button of pipelines.querySelectorAll('[role="radio"]')) button.setAttribute('aria-checked',Number(button.dataset.value)===store.snapshot().pipeline.caseId)
segmented(pipelines)
pipelines.addEventListener('change',(e)=>store.switchCase(Number(e.detail)))
const scene=mountScene(q('[data-scene]'),store)
store.subscribe(createView(root,store))
bindPlot(q('[data-plot]'),store)
q('#segment-range').addEventListener('input',(e)=>store.select(Number(e.target.value)))
q('[data-prev]').addEventListener('click',()=>store.select(store.snapshot().selected-1))
q('[data-next]').addEventListener('click',()=>store.select(store.snapshot().selected+1))
q('[data-priority]').addEventListener('click',()=>store.togglePriority())
q('[data-recover]').addEventListener('click',()=>{store.recover();q('#segment-range').focus()})
q('[data-priority-list]').addEventListener('click',(e)=>{const button=e.target.closest('[data-segment]');if(button)store.select(Number(button.dataset.segment))})
q('[data-evidence-toggle]').addEventListener('click',(e)=>{const button=e.currentTarget,panel=q('#evidence-panel');panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',!panel.hidden)})
q('[data-orbit]').addEventListener('click',(e)=>{const b=e.currentTarget,on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);q('[data-scene]').dataset.orbit=on;scene.setOrbit(on)})
q('[data-home]').addEventListener('click',()=>scene.home())
function commitDistance(event){
  event.preventDefault()
  const field=q('#distance'),raw=field.value.trim().replace(/\s/g,''),meters=Number(raw.replace(',','.')),length=store.snapshot().pipeline.lengthM
  if(!raw||!Number.isFinite(meters)||meters<0||meters>length){field.setAttribute('aria-invalid','true');q('#distance-error').textContent=`Введите расстояние от 0 до ${number(length)} м.`;field.focus();return}
  store.at(meters)
}
q('[data-coordinate]').addEventListener('submit',commitDistance)
q('#distance').addEventListener('keydown',(e)=>{
  const state=store.snapshot(),commands={ArrowUp:state.selected+1,ArrowDown:state.selected-1,Home:0,End:state.pipeline.segments.length-1}
  if(e.key in commands){e.preventDefault();store.select(commands[e.key])}
})
function setTheme(theme){
  document.documentElement.dataset.theme=theme
  try{localStorage.setItem('ds-theme',theme)}catch{}
  const label=theme==='dark'?'Светлая тема':'Тёмная тема'
  q('[data-theme-toggle]').innerHTML=`${icon(theme==='dark'?'sun':'moon')}<span data-theme-label>${label}</span>`
  q('[data-theme-toggle]').setAttribute('aria-label',`Включить ${theme==='dark'?'светлую':'тёмную'} тему`)
  document.dispatchEvent(new Event('theme:change'))
}
q('[data-theme-toggle]').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'))
setTheme(readTheme())
const observer=new ResizeObserver(()=>renderPlot(q('[data-plot]'),store.snapshot()));observer.observe(q('[data-plot]'))
window.scannerDiagnostics={snapshot:store.snapshot,stats:scene.stats}
addEventListener('pagehide',()=>{scene.dispose();observer.disconnect()},{once:true})
document.documentElement.dataset.ready=''
