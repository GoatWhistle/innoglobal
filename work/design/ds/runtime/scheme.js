const nf = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 })
export const meters = (m) => `${nf.format(Math.round(m / 10) * 10)} м`
const x = (m) => 36 + m / 12000 * 728

export function scheme(sim, selected, hover, width = 800) {
  const fontSize = Math.max(12, 12 * 800 / Math.max(280, width))
  const found = sim.detection
  const sensors = sim.sensors.map((s, i) => `<g data-sensor="${i}" class="scheme-sensor" data-tone="${s.state === 2 ? "danger" : s.state === 1 ? "warning" : ""}"><path d="M${x(s.x)} 98v32"/><circle cx="${x(s.x)}" cy="130" r="${selected === i ? 5 : 3}"/><text x="${x(s.x)}" y="154" text-anchor="middle">Д-0${s.id}</text></g>`).join("")
  const mark = sim.leak ? `<g class="scheme-insert"><path d="M${x(sim.leak.x)} 64v32"/><circle cx="${x(sim.leak.x)}" cy="98" r="4"/><text x="${x(sim.leak.x)}" y="52" text-anchor="middle">Вставлена ${meters(sim.leak.x)}</text></g>` : ""
  const zone = found ? `<g class="scheme-found"><rect x="${x(found.x - found.spread) - 3}" y="88" width="${Math.max(6, found.spread / 12000 * 1456)}" height="20"/><text x="400" y="188" text-anchor="middle">Найдено ${meters(found.x)} ± ${meters(Math.ceil(found.spread / 10) * 10)}</text></g>` : ""
  const aim = hover !== null && !sim.leak ? `<path class="scheme-aim" d="M${x(hover)} 74v48"/><text x="400" y="28" text-anchor="middle">${meters(hover)}</text>` : ""
  return `<svg viewBox="0 0 800 220" style="font-size:${fontSize}px" class="flow-scheme" role="img" aria-label="Схема трубопровода, 12 километров, шесть датчиков"><defs><pattern id="pipe-wall" width="8" height="8" patternUnits="userSpaceOnUse"><path class="scheme-hatch" d="M0 8L8 0"/></pattern></defs><path class="scheme-body" d="M36 88H764V108H36Z"/><path fill="url(#pipe-wall)" d="M36 88H764V91H36ZM36 105H764V108H36Z"/><path class="scheme-axis" d="M20 98H780"/>${sensors}${mark}${zone}${aim}<text x="36" y="210">0 м</text><text x="764" y="210" text-anchor="end">12 000 м</text></svg>`
}
