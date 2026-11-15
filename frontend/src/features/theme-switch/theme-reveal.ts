export interface RevealOrigin {
  readonly x: number
  readonly y: number
  readonly radius: number
}

export function revealOrigin(anchor: Element | null): RevealOrigin {
  const width = window.innerWidth
  const height = window.innerHeight
  const box = anchor?.getBoundingClientRect()
  const x = box === undefined ? width : box.left + box.width / 2
  const y = box === undefined ? 0 : box.top + box.height / 2
  const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y))
  return { x, y, radius }
}

export function markRevealOrigin(origin: RevealOrigin): void {
  const style = document.documentElement.style
  style.setProperty("--theme-reveal-x", `${origin.x}px`)
  style.setProperty("--theme-reveal-y", `${origin.y}px`)
  style.setProperty("--theme-reveal-radius", `${origin.radius}px`)
}
