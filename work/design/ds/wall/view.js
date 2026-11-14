import { date, icon, number, range } from '../scanner/format.js'
import { renderPlot } from '../scanner/plot.js'
import { sectionDrawing, stamp } from './drawing.js'
import { clock, picket, wallAt } from './field.js'

const QUESTIONS = {
  route: ['Трасса', 'Где на трубе тонкие места?'],
  unroll: ['Развёртка', 'Какой формы и размера каждое утонение?'],
  section: ['Сечение', 'Насколько тонко именно здесь?'],
}
const STATES = {
  loading: ['Подготавливаем трубу', 'Состояние загрузки в каталоге. Откройте готовый пример, чтобы пройти три масштаба.', 'Открыть пример'],
  error: ['Труба не получена', 'Данные не загрузились. Выбранная труба сохранена.', 'Повторить'],
  empty: ['Сегменты пока не загружены', 'Для развёртки нужны координаты сегментов и прогноз толщины.', 'Открыть пример'],
}

export function createView(root, store) {
  const q = (s) => root.querySelector(s)
  let listKey = null
  return (state) => {
    const { pipeline: p, segment: s, selected, priority, priorities, status, mode, hour, hourPicked } = state
    root.dataset.selectedSegment = selected; root.dataset.mode = mode
    q('[data-marking]').innerHTML = `<span>Ø${number(p.diameterMm)}×${number(p.nominalMm)}</span><span>ТРУБА ${p.caseId}</span><span data-marking-picket>${s ? picket(s.startM) : 'ПК —'}</span>`
    q('[data-marking]').setAttribute('aria-label', `Труба ${p.caseId}, диаметр ${number(p.diameterMm)} на ${number(p.nominalMm)} мм${s ? `, ${picket(s.startM).replace('ПК', 'пикет')}` : ''}`)
    q('[data-scale-name]').textContent = QUESTIONS[mode][0]; q('[data-question]').textContent = QUESTIONS[mode][1]
    q('[data-case]').textContent = p.caseId === 1 ? 'Между обследованиями ВТД' : 'От ввода до первого ВТД'
    q('[data-date]').textContent = date(p.targetDate); q('[data-date]').dateTime = p.targetDate
    for (const key of root.querySelectorAll('[data-cam] [role="radio"]')) key.setAttribute('aria-checked', String(key.dataset.value === mode))
    const unavailable = status !== 'ready' || !s
    q('[data-state-panel]').hidden = !unavailable; q('[data-state-panel]').dataset.status = status; q('[data-content]').hidden = unavailable
    if (unavailable) { const t = STATES[status] ?? STATES.empty; q('#state-title').textContent = t[0]; q('[data-state-description]').textContent = t[1]; q('[data-recover-label]').textContent = t[2]; return }
    const mm = wallAt(p, s, hour)
    const baseline = Number.isFinite(s.baselineMm) ? `${number(s.baselineMm, 2)} мм` : 'Нет данных'
    const delta = Number.isFinite(s.baselineMm) ? `−${number(s.baselineMm - s.predictedMm, 2)} мм` : 'Нет данных'
    const interval = Number.isFinite(s.p10Mm) && Number.isFinite(s.p90Mm) ? `${number(s.p10Mm, 2)}–${number(s.p90Mm, 2)} мм` : 'Нет интервала'
    const baseName = p.caseId === 1 ? 'Предыдущий ВТД' : 'Номинал при вводе'
    const facts = `<div><dt>${baseName}</dt><dd>${baseline}</dd></div><div><dt>Изменение</dt><dd>${delta}</dd></div><div><dt>P10–P90</dt><dd>${interval}</dd></div>`
    q('[data-readout]').innerHTML = `<p class="readout-label"><span>Сегмент ${selected}</span><span>${range(s)}</span></p>
<p class="readout-figure"><span class="readout-number">${number(s.predictedMm, 2)}</span><span class="readout-unit">мм</span></p>
<p class="readout-caption">Минимальная толщина, прогноз${priorities.has(selected) ? ' · <strong>в списке проверки</strong>' : ''}</p>
<dl class="readout-facts">${facts}</dl>`
    q('[data-sheet-number]').textContent = number(s.predictedMm, 2)
    q('[data-sheet-title]').textContent = `Сегмент ${selected} · ${range(s)}`
    q('[data-sheet-point]').textContent = `${hourPicked ? 'Выбранная точка' : 'Самое тонкое место'}: ${clock(hour)}, ${number(mm, 2)} мм`
    q('[data-sheet-drawing]').innerHTML = sectionDrawing(p, s, hour)
    q('[data-sheet-facts]').innerHTML = facts
    q('[data-stamp]').innerHTML = stamp(p, s, { sheet: `${QUESTIONS[mode][0]}, ${['route', 'unroll', 'section'].indexOf(mode) + 1} из 3` })
    q('[data-position]').textContent = range(s)
    const field = q('#distance'); field.value = number(s.startM); field.removeAttribute('aria-invalid'); q('#distance-error').textContent = ''
    q('[data-prev]').disabled = selected === 0; q('[data-next]').disabled = selected === p.segments.length - 1
    q('[data-observed-legend]').hidden = !p.segments.some((x) => Number.isFinite(x.observedMm))
    q('[data-band-legend]').hidden = !Number.isFinite(s.p10Mm)
    renderPlot(q('[data-plot]'), state)
    q('[data-priority]').setAttribute('aria-pressed', priority); q('[data-priority]').setAttribute('aria-expanded', priority); q('#priority-panel').hidden = !priority
    q('[data-priority-summary]').textContent = `${number(priorities.size)} из ${number(p.segments.length)} сегментов`
    const key = `${p.id}:${priority}`
    if (listKey !== key) {
      q('[data-priority-list]').innerHTML = [...priorities].map((id) => { const v = p.segments[id]; return `<button class="pipe-priority-row" data-segment="${id}" aria-pressed="false"><span>${range(v)}</span><small>Сегмент ${id}</small><span>${number(v.predictedMm, 2)} мм ${icon('chevron-right')}</span></button>` }).join('')
      listKey = key
    }
    for (const b of q('[data-priority-list]').children) b.setAttribute('aria-pressed', String(Number(b.dataset.segment) === selected))
    const measured = Number.isFinite(s.observedMm) ? `${number(s.observedMm, 2)} мм на ${date(p.baselineDate)}.` : 'Замеров ВТД этого сегмента нет.'
    q('[data-evidence]').innerHTML = `<div><h3>Исходная точка</h3><p>${measured}</p></div><div><h3>Распределение по окружности</h3><p>Карта развёртки построена правилом примера: утонение сосредоточено около 6 часов. Это иллюстрация, а не замер.</p></div><div><h3>Условия участка</h3><p>${s.factors ? `Обводнённость ${number(s.factors.waterPercent, 1)}%, скорость ${number(s.factors.velocityMs, 2)} м/с. Синтетические значения.` : 'Данные о режиме не предоставлены.'}</p></div>`
    q('[data-announcement]').textContent = `${QUESTIONS[mode][0]}. Сегмент ${selected}, ${range(s)}. Прогноз ${number(s.predictedMm, 2)} мм.`
  }
}
