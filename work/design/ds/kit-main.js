import { combobox } from "./kit-combobox.js"
import { dateRange } from "./controls/calendar.js"
import {
  busyButton,
  copyButton,
  disclosure,
  numberField,
  scrollArea,
  searchField,
  segmented,
  slider,
  tabs,
} from "./kit-controls.js"
import { countdown, indeterminate, skeletonDemo, table } from "./kit-data.js"
import { iconSheet } from "./kit-icons.js"
import { menu, popover, selectBox } from "./kit-layer.js"
import { dialogs, toast, tooltips } from "./kit-overlay.js"
import { themeSwitch } from "./kit-theme.js"

const PARTS = ["actions", "fields", "choice", "layers", "overlays", "data", "status", "errors", "icons"]

const each = (selector, fn) => document.querySelectorAll(selector).forEach(fn)

function nav() {
  const host = document.querySelector("[data-nav]")
  let group = ""
  const links = []
  for (const s of document.querySelectorAll(".kit-section")) {
    if (s.dataset.group !== group) {
      group = s.dataset.group
      host.insertAdjacentHTML("beforeend", `<h3>${group}</h3>`)
    }
    const a = document.createElement("a")
    a.href = `#${s.id}`
    a.textContent = s.querySelector("h2").textContent
    host.append(a)
    links.push(a)
  }
  const seen = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        for (const a of links) a.setAttribute("aria-current", String(a.hash === `#${e.target.id}`))
        const a = links.find((l) => l.hash === `#${e.target.id}`)
        if (a) {
          host.scrollTop = a.offsetTop - host.clientHeight / 2
          host.scrollLeft = a.offsetLeft - host.clientWidth / 2
        }
      }
    },
    { rootMargin: "-30% 0px -65% 0px" },
  )
  each(".kit-section", (s) => seen.observe(s))
}

async function boot() {
  const main = document.querySelector("[data-parts]")
  const html = await Promise.all(PARTS.map((p) => fetch(`kit-part-${p}.html`).then((r) => (r.ok ? r.text() : ""))))
  main.innerHTML = html.join("")
  await iconSheet(document.querySelector("[data-icon-sheet]"))
  main.insertAdjacentHTML("afterbegin", `<section class="kit-section" id="forecast-components" data-group="Труба"><div class="kit-head"><h2>Детали трубы</h2><p>Бирка, маркировка, шкала стенки, полоса сегментов, размерная линия, клавиша камеры, матовая панель, штамп.</p></div><div class="kit-demo"><a class="button button-primary" href="pipe-kit.html">Детали трубы</a><a class="button button-secondary" href="screen-pipe.html">Экран трубы</a></div><p>Ниже общие контролы со всеми состояниями. Примеры взяты из кейса стенки: сегменты, обследования ВТД и прогноз на дату T.</p></section>`)
  nav()
  themeSwitch(document.querySelector("[data-theme-switch]"))
  each("[data-segmented]", segmented)
  each("[data-tabs]", tabs)
  each("[data-slider]", slider)
  each("[data-number]", numberField)
  each("[data-search]", searchField)
  each("[data-disclosure]", disclosure)
  each("[data-copy]", copyButton)
  each("[data-scroll-area]", scrollArea)
  each("[data-busy-demo]", busyButton)
  each("[data-select]", selectBox)
  each("[data-combobox]", combobox)
  each("[data-date-range]", dateRange)
  each("[data-menu]", menu)
  each("[data-popover]", popover)
  each("[data-table]", table)
  each("[data-skeleton-demo]", skeletonDemo)
  each("[data-countdown]", countdown)
  each("[data-toast]", (b) => b.addEventListener("click", () => toast(b.dataset.toast)))
  indeterminate()
  dialogs()
  tooltips()
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView()
  document.documentElement.dataset.ready = ""
}

boot()
