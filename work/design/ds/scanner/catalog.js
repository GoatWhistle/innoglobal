import { makeExample } from './data.js'
import { sectionSvg } from './section.js'
import { renderPlot } from './plot.js'
import { icon } from './format.js'
import { readTheme } from '../kit-theme.js'

const samples=[['baseline',0,'Исходная стенка'],['priority',630,'Приоритет проверки'],['missing',630,'Без интервала']]
for(const [id,index] of samples){
  const p=makeExample(1,id==='missing'?'missing':'ready'),s=p.segments[index]
  document.querySelector(`[data-specimen="${id}"]`).innerHTML=sectionSvg(s,p.nominalMm,`wall-${id}`)
}
const plot=document.querySelector('[data-catalog-plot]'),p=makeExample(1)
const draw=()=>renderPlot(plot,{pipeline:p,segment:p.segments[630],priority:false,priorities:new Set()})
new ResizeObserver(draw).observe(plot)
function theme(value){
  document.documentElement.dataset.theme=value
  try{localStorage.setItem('ds-theme',value)}catch{}
  const button=document.querySelector('[data-theme-toggle]')
  button.innerHTML=`${icon(value==='dark'?'sun':'moon')} ${value==='dark'?'Светлая тема':'Тёмная тема'}`
}
document.querySelector('[data-theme-toggle]').addEventListener('click',()=>theme(document.documentElement.dataset.theme==='dark'?'light':'dark'))
theme(readTheme())
document.querySelector('[data-catalog-range]').addEventListener('input',(event)=>{
  const segment=p.segments[Number(event.target.value)]
  document.querySelector('[data-specimen="priority"]').innerHTML=sectionSvg(segment,p.nominalMm,'wall-priority')
  renderPlot(plot,{pipeline:p,segment,priority:false,priorities:new Set()})
  document.querySelector('[data-catalog-output]').textContent=`Сегмент ${segment.id}`
})
