import { readTheme } from './kit-theme.js'

const toggle = document.querySelector('[data-theme-toggle]')
const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="icons.svg#${name}"/></svg>`

function setTheme(theme) {
  document.documentElement.dataset.theme = theme
  try { localStorage.setItem('ds-theme', theme) } catch {}
  toggle.innerHTML = `${icon(theme === 'dark' ? 'sun' : 'moon')}<span>${theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>`
  toggle.setAttribute('aria-label', `Включить ${theme === 'dark' ? 'светлую' : 'тёмную'} тему`)
}

toggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'))
setTheme(readTheme())
