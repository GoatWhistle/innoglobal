import { number } from './format.js'

export function sectionSvg(segment, nominalMm, id = 'wall') {
  const t = segment.predictedMm / nominalMm
  const r = 88, original = 36, current = original * Math.max(0, Math.min(1, t))
  return `<svg class="wall-section" viewBox="0 0 300 235" role="img" aria-label="Условное сечение: минимум ${number(segment.predictedMm, 2)} мм, номинальная толщина ${number(nominalMm, 2)} мм">
<defs><pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V6" class="wall-hatch"/></pattern></defs>
<path d="M30 118H268M148 10V225" class="wall-axis"/>
<circle cx="148" cy="118" r="${r - original / 2}" fill="none" class="wall-original" stroke-width="${original}"/>
<circle cx="148" cy="118" r="${r - current / 2}" fill="none" class="wall-current" stroke-width="${current}"/>
<circle cx="148" cy="118" r="${r - current / 2}" fill="none" stroke="url(#${id})" stroke-width="${current}"/>
<circle cx="148" cy="118" r="${r}" class="wall-outline"/><circle cx="148" cy="118" r="${r-original}" class="wall-nominal"/>
<path d="M148 ${118-r}H278M148 ${118-r+current}H278M267 ${118-r-5}V${118-r+current+5}M263 ${118-r+4}l8 -8M263 ${118-r+current+4}l8 -8" class="wall-dimension"/>
<text x="148" y="116" text-anchor="middle" class="wall-number">${number(segment.predictedMm, 2)}</text><text x="148" y="139" text-anchor="middle" class="wall-unit">мм</text>
</svg>`
}
