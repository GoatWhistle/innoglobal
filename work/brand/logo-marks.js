const B = 'fill="currentColor"'
const A = 'fill="var(--acc)"'
const S = (w) => `fill="none" stroke="currentColor" stroke-width="${w}"`
const SA = (w) => `fill="none" stroke="var(--acc)" stroke-width="${w}"`

function drop(cx, tip, h, r) {
  const y = tip + h
  return `M${cx} ${tip}C${cx + r * 0.25} ${tip + h * 0.35} ${cx + r} ${y - r * 0.6} ${cx + r} ${y}A${r} ${r} 0 1 1 ${cx - r} ${y}C${cx - r} ${y - r * 0.6} ${cx - r * 0.25} ${tip + h * 0.35} ${cx} ${tip}Z`
}

function bob(cx, top, r, tip) {
  return `M${cx - r} ${top + r}A${r} ${r} 0 1 1 ${cx + r} ${top + r}C${cx + r} ${top + r * 1.7} ${cx + r * 0.3} ${tip - r * 0.6} ${cx} ${tip}C${cx - r * 0.3} ${tip - r * 0.6} ${cx - r} ${top + r * 1.7} ${cx - r} ${top + r}Z`
}

function arc(cx, cy, r, from, to) {
  const p = (a) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)].map((v) => v.toFixed(2)).join(" ")
  const span = ((to - from) % 360 + 360) % 360
  return `M${p(from)}A${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${p(to)}`
}

const GLYPH = {
  cCut: { w: 92, sb: 7, box: "-24 -20 140 165", body: `<path d="${arc(50, 50, 39, 40, 320)}" ${S(22)}/><path d="${drop(80, 106, 30, 12)}" ${A}/>` },
  iDrop: { w: 22, sb: 11, box: "-39 -30 100 165", body: `<rect x="0" y="0" width="22" height="100" ${B}/><path d="${drop(11, 110, 28, 14)}" ${A}/>` },
  oHole: { w: 100, sb: 7, box: "-20 -20 140 165", body: `<path d="${arc(50, 50, 39, 103, 77)}" ${S(22)}/><path d="${drop(50, 104, 30, 12)}" ${A}/>` },
  aOil: { w: 100, sb: 7, box: "-20 -20 140 140", body: `<circle cx="47" cy="50" r="29" ${A}/><circle cx="47" cy="50" r="39" ${S(22)}/><rect x="78" y="0" width="22" height="100" ${B}/>` },
  lPlumb: { w: 22, sb: 11, box: "-50 -50 122 200", body: `<rect x="0" y="-31" width="22" height="98" ${B}/><rect x="9.5" y="66" width="3" height="18" ${B}/><path d="${bob(11, 84, 12, 138)}" ${A}/>` },
}

function glyph(key) {
  const g = GLYPH[key]
  return `<svg viewBox="${-g.sb} 0 ${g.w + g.sb * 2} 100" aria-hidden="true">${g.body}</svg>`
}

function glyphIcon(key) {
  return `<svg class="mark" viewBox="${GLYPH[key].box}">${GLYPH[key].body}</svg>`
}

const SYMBOL = {
  ringDrop: `<path d="${arc(32, 27, 18, 102, 78)}" ${S(6)}/><circle cx="32" cy="27" r="9" ${B}/><path d="${drop(32, 47, 7, 5)}" ${A}/>`,
  dPipe: `<path d="M13 7H29A20 20 0 0 1 29 47H13Z" ${S(6)} stroke-linejoin="miter"/><path d="${drop(29, 51, 5, 4)}" ${A}/>`,
  dLetter: `<circle cx="26" cy="35" r="14" ${S(6)}/><rect x="40" y="5" width="6" height="44" ${B}/><path d="${drop(43, 52, 5, 3.6)}" ${A}/>`,
  deltaDrop: `<path d="M32 8L58 54H6Z" ${S(6)} stroke-linejoin="miter"/><path d="${drop(32, 25, 11, 7)}" ${A}/>`,
  deltaP: `<path d="M4 46L19 15L34 46Z" ${S(5)} stroke-linejoin="miter"/><rect x="39" y="22" width="5" height="34" ${B}/><circle cx="50" cy="33" r="8.5" ${S(5)}/><circle cx="19" cy="38" r="3.4" ${A}/>`,
  deltaBreak: `<path d="M26 52H7L32 9L57 52H38" ${S(6)} stroke-linejoin="miter"/><path d="${drop(32, 49, 6, 4.2)}" ${A}/>`,
  split: `<path d="M6 22H58" ${S(6)}/><path d="M6 36H33" ${S(6)}/><path d="M33 36L40 46H58" ${SA(6)} stroke-linejoin="miter"/>`,
  tee: `<rect x="8" y="9" width="48" height="6" ${B}/><rect x="8" y="19" width="48" height="6" ${B}/><rect x="29" y="25" width="6" height="22" ${B}/><path d="${drop(32, 49, 7, 4.5)}" ${A}/>`,
  bead: `<path d="${drop(32, 5, 37, 17)}" ${S(5)} stroke-linejoin="round"/><circle cx="32" cy="42" r="7" ${A}/>`,
  rings: `<circle cx="32" cy="28" r="22" ${S(5)}/><circle cx="32" cy="28" r="11" ${S(5)}/><circle cx="32" cy="57" r="4" ${A}/>`,
  seep: `<path d="${drop(15, 8, 7, 4)}" ${B}/><path d="${drop(29, 17, 10, 6)}" ${B}/><path d="${drop(46, 24, 15, 9)}" ${A}/>`,
  bob: `<rect x="30.5" y="3" width="3" height="20" ${B}/><path d="${bob(32, 22, 12, 60)}" ${A}/><circle cx="32" cy="34" r="4" ${B}/>`,
  isobar: `<circle cx="32" cy="30" r="9" ${S(4)}/><circle cx="32" cy="30" r="17" ${S(4)}/><path d="${arc(32, 30, 25, 104, 76)}" ${S(4)}/><path d="${drop(32, 52, 6, 4)}" ${A}/>`,
  intact: `<circle cx="32" cy="32" r="22" ${S(6)}/><circle cx="32" cy="32" r="11" ${A}/><rect x="30.5" y="4" width="3" height="12" ${B}/>`,
  pipeTee: `<path d="M6 12H58V28H40V50H24V28H6Z" ${S(5)} stroke-linejoin="miter"/><rect x="20" y="50" width="24" height="7" ${A}/>`,
}

const symbol = (key) => `<svg class="mark" viewBox="0 0 64 64">${SYMBOL[key]}</svg>`

window.MARKS = [
  { n: 1, name: "Darcy", arch: "Шрифтовой знак", idea: "Буква «c» — сечение трубы, из нижнего края падает капля.", wm: `dar${glyph("cCut")}y`, icon: glyphIcon("cCut") },
  { n: 2, name: "Darcy", arch: "Символ", idea: "Труба в сечении, заполнена нефтью; снизу свищ и капля.", icon: symbol("ringDrop") },
  { n: 3, name: "Darcy", arch: "Монограмма", idea: "D собрана как колено трубы, капля у основания.", icon: symbol("dPipe"), wm: "darcy" },
  { n: 4, name: "Darcy", arch: "Буква-символ", idea: "Строчная d, капля сорвалась с ножки.", icon: symbol("dLetter") },
  { n: 5, name: "Darcy", arch: "Знак и слово", idea: "Сечение трубы рядом со словом: читается с проектора.", icon: symbol("ringDrop"), wm: "darcy" },
  { n: 6, name: "Deltap", arch: "Символ", idea: "ΔP — перепад давления, внутри капля.", icon: symbol("deltaDrop") },
  { n: 7, name: "Deltap", arch: "Монограмма", idea: "Δp: треугольник и p, точка-капля внутри Δ.", icon: symbol("deltaP"), wm: "deltap" },
  { n: 8, name: "Deltap", arch: "Знак и слово", idea: "Основание Δ разорвано, в разрыве капля.", icon: symbol("deltaBreak"), wm: "deltap" },
  { n: 9, name: "Twinline", arch: "Символ", idea: "Две линии — модель и замер; нижняя уходит вниз там, где утечка.", icon: symbol("split") },
  { n: 10, name: "Twinline", arch: "Шрифтовой знак", idea: "Точка второй i сорвалась каплей под строку.", wm: `twinl${glyph("iDrop")}ne`, icon: glyphIcon("iDrop") },
  { n: 11, name: "Twinline", arch: "Знак и слово", idea: "Расходящиеся линии и слово.", icon: symbol("split"), wm: "twinline" },
  { n: 12, name: "Twinline", arch: "Монограмма", idea: "T с двойной перекладиной, с ножки капает.", icon: symbol("tee"), wm: "twinline" },
  { n: 13, name: "Kapla", arch: "Символ", idea: "Контур капли, внутри нефть.", icon: symbol("bead") },
  { n: 14, name: "Kapla", arch: "Шрифтовой знак", idea: "Чаша последней a залита нефтью.", wm: `kapl${glyph("aOil")}`, icon: glyphIcon("aOil") },
  { n: 15, name: "Pinhole", arch: "Символ", idea: "Стенка трубы в два слоя, под ней вытекшая точка.", icon: symbol("rings"), wm: "pinhole" },
  { n: 16, name: "Pinhole", arch: "Шрифтовой знак", idea: "Буква o с точечным свищом снизу.", wm: `pinh${glyph("oHole")}le`, icon: glyphIcon("oHole") },
  { n: 17, name: "Seep", arch: "Знак и слово", idea: "Капли растут: так нефть сочится и копится.", icon: symbol("seep"), wm: "seep" },
  { n: 18, name: "Plumb", arch: "Символ", idea: "Отвес — инструмент точности и капля одновременно.", icon: symbol("bob") },
  { n: 19, name: "Plumb", arch: "Шрифтовой знак", idea: "Буква l превращается в отвес.", wm: `p${glyph("lPlumb")}umb`, icon: glyphIcon("lPlumb") },
  { n: 20, name: "Isobar", arch: "Знак и слово", idea: "Изобары давления; внешняя разорвана утечкой.", icon: symbol("isobar"), wm: "isobar" },
  { n: 21, name: "Intact", arch: "Знак и слово", idea: "Целая труба с шовной отметкой, внутри нефть.", icon: symbol("intact"), wm: "intact" },
  { n: 22, name: "Truba", arch: "Знак и слово", idea: "Тройник трубопровода с фланцем.", icon: symbol("pipeTee"), wm: "truba" },
]
