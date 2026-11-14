import { date, icon, number, range } from './format.js'
import { sectionSvg } from './section.js'
import { renderPlot } from './plot.js'

export function createView(root, store) {
  const q=(selector)=>root.querySelector(selector)
  let previousPipeline=null,previousPriority=null
  const states={
    loading:['Подготавливаем профиль','Состояние загрузки в каталоге. Откройте готовый пример, чтобы исследовать трубу.','Открыть пример'],
    error:['Профиль не получен','Данные не загрузились. Выбранная труба сохранена.','Повторить'],
    empty:['Сегменты пока не загружены','Для профиля нужны координаты сегментов и прогноз толщины.','Открыть пример'],
  }
  return (state)=>{
    const {pipeline:p,segment:s,selected,priority,priorities,status}=state
    root.dataset.selectedSegment=selected
    q('[data-case]').textContent=p.caseId===1?'Между обследованиями ВТД':'От ввода до первого ВТД'
    q('[data-date]').textContent=date(p.targetDate);q('[data-date]').dateTime=p.targetDate
    q('[data-pipe-meta]').textContent=`${number(p.lengthM)} м / Ø ${number(p.diameterMm)} мм / стенка ${number(p.nominalMm)} мм`
    const unavailable=status!=='ready'||!s
    q('[data-state-panel]').hidden=!unavailable;q('[data-state-panel]').dataset.status=status;q('[data-content]').hidden=unavailable
    if(unavailable){const text=states[status]??states.empty;q('#state-title').textContent=text[0];q('[data-state-description]').textContent=text[1];q('[data-recover-label]').textContent=text[2];return}
    q('[data-segment-title]').textContent=`Сегмент ${selected}`
    q('[data-priority-label]').hidden=!priorities.has(selected)
    q('[data-section]').innerHTML=sectionSvg(s,p.nominalMm)
    q('[data-position]').textContent=range(s)
    q('[data-midpoint]').textContent=`${number(p.lengthM/2)} м`;q('[data-length]').textContent=`${number(p.lengthM)} м`
    q('#segment-range').max=p.segments.length-1;q('#segment-range').value=selected
    q('#segment-range').setAttribute('aria-valuetext',`Сегмент ${selected}, ${range(s)}, ${number(s.predictedMm,2)} мм`)
    const field=q('#distance');field.value=number(s.startM);field.setAttribute('aria-valuenow',s.startM);field.setAttribute('aria-valuemax',p.lengthM);field.removeAttribute('aria-invalid');q('#distance-error').textContent=''
    q('[data-prev]').disabled=selected===0;q('[data-next]').disabled=selected===p.segments.length-1
    const baselineValue=Number.isFinite(s.baselineMm)?`${number(s.baselineMm,2)} мм`:'Нет данных'
    const delta=Number.isFinite(s.baselineMm)?`−${number(s.baselineMm-s.predictedMm,2)} мм`:'Нет данных'
    const baseline=p.caseId===1?'По предыдущему ВТД':'Номинальная при вводе'
    const interval=Number.isFinite(s.p10Mm)&&Number.isFinite(s.p90Mm)?`${number(s.p10Mm,2)}–${number(s.p90Mm,2)} мм`:'Нет интервала'
    q('[data-facts]').innerHTML=`<div><dt>${baseline}</dt><dd>${baselineValue}</dd></div><div><dt>Изменение</dt><dd>${delta}</dd></div><div><dt>P10–P90</dt><dd>${interval}</dd></div>`
    q('[data-observed-legend]').hidden=!p.segments.some((x)=>Number.isFinite(x.observedMm))
    q('[data-band-legend]').hidden=!Number.isFinite(s.p10Mm)
    q('[data-profile-note]').textContent=Number.isFinite(s.p10Mm)?'Интервал иллюстративный, покрытие не оценивалось.':'Интервал неопределённости не предоставлен.'
    renderPlot(q('[data-plot]'),state)
    q('[data-priority]').setAttribute('aria-pressed',priority);q('[data-priority]').setAttribute('aria-expanded',priority);q('#priority-panel').hidden=!priority
    q('[data-priority-summary]').textContent=`${number(priorities.size)} из ${number(p.segments.length)} сегментов`
    if(previousPipeline!==p||previousPriority!==priority){
      q('[data-priority-list]').innerHTML=[...priorities].map((id)=>{const v=p.segments[id];return `<button class="scan-priority-row" data-segment="${id}" aria-pressed="${id===selected}"><span>${range(v)}</span><small>Сегмент ${id}</small><span>${number(v.predictedMm,2)} мм ${icon('chevron-right')}</span></button>`}).join('')
      previousPipeline=p;previousPriority=priority
    }
    for(const button of q('[data-priority-list]').children)button.setAttribute('aria-pressed',Number(button.dataset.segment)===selected)
    const measured=Number.isFinite(s.observedMm)?`${number(s.observedMm,2)} мм на ${date(p.baselineDate)}.`:'Замеров ВТД этого сегмента нет.'
    q('[data-evidence]').innerHTML=`<div class="scan-evidence-grid"><div><h3>Исходная точка</h3><p>${measured} ${p.caseId===2?`В расчёте примера используется номинальная толщина ${number(p.nominalMm,2)} мм.`:''}</p></div><div><h3>Условия участка</h3><p>${s.factors?`Обводнённость ${number(s.factors.waterPercent,1)}%. Скорость жидкости ${number(s.factors.velocityMs,2)} м/с. Синтетические значения.`:'Данные о режиме не предоставлены.'}</p></div><div><h3>Основание прогноза</h3><p>Детерминированный пример для проверки интерфейса. Обученной модели и подтверждённых причин утонения нет.</p></div></div>`
    q('[data-announcement]').textContent=`Сегмент ${selected}, ${range(s)}. Прогноз ${number(s.predictedMm,2)} мм.`
  }
}
