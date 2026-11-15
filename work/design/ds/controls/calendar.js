import { control, icon } from '../kit-layer.js'

const DAY=86400000
const format=(date)=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(date)
const same=(a,b)=>a.getTime()===b.getTime()

export function dateRange(root) {
  const trigger=root.querySelector('.select-trigger'),layer=document.getElementById(trigger.getAttribute('aria-controls'))
  const value=trigger.querySelector('.select-value'),grid=layer.querySelector('.cal-grid'),heading=layer.querySelector('.cal-head span')
  const [previous,next]=layer.querySelectorAll('.cal-head button')
  const today=new Date(Date.UTC(2026,10,12))
  let month=new Date(Date.UTC(2026,10,1)),start=new Date(Date.UTC(2026,10,10)),end=today,picking=false
  const ui=control(trigger,layer,{keepOnTab:true,onOpen:()=>grid.querySelector('[data-edge]')?.focus({preventScroll:true})})
  const render=()=>{
    heading.textContent=new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric',timeZone:'UTC'}).format(month)
    next.disabled=month.getTime()>=Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),1)
    const offset=(month.getUTCDay()+6)%7
    grid.innerHTML=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((d)=>`<span aria-hidden="true">${d}</span>`).join('')
    for(let i=0;i<42;i++){
      const date=new Date(month.getTime()+(i-offset)*DAY),outside=date.getUTCMonth()!==month.getUTCMonth()
      const button=document.createElement('button');button.type='button';button.className='cal-day';button.textContent=date.getUTCDate()
      button.dataset.date=date.toISOString();button.toggleAttribute('data-out',outside);button.disabled=date>today
      button.toggleAttribute('data-edge',same(date,start)||same(date,end));button.toggleAttribute('data-in',date>start&&date<end)
      button.setAttribute('aria-label',format(date));button.setAttribute('aria-pressed',date>=start&&date<=end)
      if(same(date,today))button.setAttribute('aria-current','date')
      grid.append(button)
    }
  }
  const move=(delta)=>{month=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+delta,1));render()}
  previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1))
  grid.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-date]');if(!button)return
    const date=new Date(button.dataset.date)
    if(!picking){start=date;end=date;picking=true}else{if(date<start){end=start;start=date}else end=date;picking=false}
    const selected=button.dataset.date;render();grid.querySelector(`[data-date="${selected}"]`)?.focus()
  })
  grid.addEventListener('keydown',(event)=>{
    const button=event.target.closest('[data-date]');if(!button)return
    const step={ArrowRight:1,ArrowLeft:-1,ArrowDown:7,ArrowUp:-7}[event.key];if(!step)return
    event.preventDefault();const date=new Date(new Date(button.dataset.date).getTime()+step*DAY);if(date>today)return
    if(date.getUTCMonth()!==month.getUTCMonth()){month=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1));render()}
    grid.querySelector(`[data-date="${date.toISOString()}"]`)?.focus()
  })
  const presets=[...layer.querySelectorAll('[role="option"]')]
  for(const preset of presets){preset.insertAdjacentHTML('afterbegin',icon('check','icon option-check'));preset.addEventListener('click',()=>{for(const item of presets)item.setAttribute('aria-selected',item===preset);value.textContent=preset.querySelector('.option-label').textContent;ui.close(true)})}
  trigger.addEventListener('click',ui.toggle)
  layer.querySelector('[data-apply]').addEventListener('click',()=>{
    const fields=[...layer.querySelectorAll('.range-time input')]
    const invalid=fields.find((field)=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(field.value))
    for(const field of fields)field.removeAttribute('aria-invalid')
    if(invalid){invalid.setAttribute('aria-invalid','true');invalid.setCustomValidity('Введите время в формате ЧЧ:ММ');invalid.reportValidity();invalid.focus();return}
    fields.forEach((field)=>field.setCustomValidity(''))
    if(same(start,end)&&fields[0].value>fields[1].value){fields[1].setCustomValidity('Конец периода должен быть позже начала');fields[1].reportValidity();return}
    value.textContent=`${format(start)}, ${fields[0].value} – ${format(end)}, ${fields[1].value}`
    ui.close(true)
  })
  layer.querySelector('[data-close]').addEventListener('click',()=>ui.close(true))
  render()
}
