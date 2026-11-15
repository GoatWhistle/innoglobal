export const number = (value, digits = 0) => Number.isFinite(value)
  ? new Intl.NumberFormat('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value) : 'Нет данных'
export const date = (value) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value))
export const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="/work/design/ds/icons.svg#${name}"/></svg>`
export const range = (segment) => `${number(segment.startM)}–${number(segment.endM)} м`
export const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
