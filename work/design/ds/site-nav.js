const ROOT = new URL('./', import.meta.url)
const DOCS = ['index.html', 'doc-drawing.html', 'doc-base.html', 'doc-layout.html', 'doc-data.html', 'doc-charts.html', 'doc-alerts.html', 'doc-forms.html', 'doc-words.html']

export const SECTIONS = [
  { label: 'Основы', href: 'index.html', pages: DOCS.map((file) => [file]) },
  { label: 'Компоненты', href: 'pipe-kit.html', pages: [['pipe-kit.html', 'Детали трубы'], ['kit.html', 'Общий набор']] },
  { label: 'Экраны', href: 'screen-pipe.html', pages: [['screen-pipe.html', 'Труба'], ['scanner/blueprints.html', 'Будущие экраны']] },
  { label: 'Архив', href: 'archive.html', pages: [['archive.html']] },
]

const url = (file) => new URL(file, ROOT).pathname
const here = location.pathname.endsWith('/') ? `${location.pathname}index.html` : location.pathname

export const currentSection = () => SECTIONS.find((s) => s.pages.some(([file]) => url(file) === here))

export function navLinks() {
  const current = currentSection()
  return SECTIONS.map((s) => `<a href="${url(s.href)}"${s === current ? ' aria-current="page"' : ''}>${s.label}</a>`).join('')
}

function subBar(section) {
  const named = section?.pages.filter(([, label]) => label) ?? []
  if (named.length < 2) return null
  const bar = document.createElement('nav')
  bar.className = 'site-sub'
  bar.setAttribute('aria-label', `Страницы раздела «${section.label}»`)
  bar.innerHTML = `<span class="site-sub-title">${section.label}</span><span class="site-sub-switch">${named.map(([file, label]) => `<a href="${url(file)}"${url(file) === here ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</span>`
  return bar
}

for (const host of document.querySelectorAll('[data-site-nav]')) {
  host.innerHTML = navLinks()
  const bar = subBar(currentSection())
  if (bar) host.closest('header')?.after(bar)
}
