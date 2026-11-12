const WIDE = { w: 1440, cx: 720, cy: 340, rw: 1440, rh: 490 }
const WATCH = { w: 1440, cx: 720, cy: 365, rw: 1440, rh: 440 }
const ZOOM = { w: 1440, cx: 740, cy: 345, rw: 640, rh: 430 }
const TALL = { dark: { w: 375, cx: 187, cy: 452, rw: 375, rh: 330 }, light: { w: 375, cx: 187, cy: 418, rw: 375, rh: 330 } }

const SHOTS = {
  calm: { wide: ["desk", "idle", WIDE], narrow: ["mob", "idle", TALL] },
  watch: { wide: ["desk", "watch", WATCH], narrow: ["desk", "watch", ZOOM] },
  leak: { wide: ["desk", "leak", WIDE], narrow: ["desk", "leak", ZOOM] },
}

const narrow = matchMedia("(max-width: 48rem)")

export function sceneShot(host, kind) {
  const frame = document.createElement("div")
  frame.className = "shot-frame"
  const img = document.createElement("img")
  img.alt = ""
  img.decoding = "async"
  frame.append(img)
  host.replaceChildren(frame)
  const place = () => {
    const theme = document.documentElement.dataset.theme === "light" ? "light" : "dark"
    const [device, name, region] = SHOTS[kind][narrow.matches ? "narrow" : "wide"]
    const r = region[theme] ?? region
    const src = `shots/screens/scene/${device}-${theme}-${name}.png`
    if (img.getAttribute("src") !== src) img.src = src
    const W = host.clientWidth
    const H = host.clientHeight
    const k = Math.min(W / r.rw, H / r.rh)
    frame.style.inlineSize = `${r.rw * k}px`
    frame.style.blockSize = `${r.rh * k}px`
    img.style.inlineSize = `${r.w * k}px`
    img.style.insetInlineStart = `${(r.rw / 2 - r.cx) * k}px`
    img.style.insetBlockStart = `${(r.rh / 2 - r.cy) * k}px`
  }
  new ResizeObserver(place).observe(host)
  narrow.addEventListener("change", place)
  new MutationObserver(place).observe(document.documentElement, { attributeFilter: ["data-theme"] })
  place()
}
