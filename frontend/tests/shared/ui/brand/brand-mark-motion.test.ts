import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8")
const motion = read("src/shared/styles/tokens/motion.css")
const keyframes = read("src/shared/styles/tokens/keyframes.css")
const semantic = read("src/shared/styles/tokens/semantic.css")
const module = read(join("src/shared/ui/brand/brand-mark", "brand-mark.module.css"))

const reducedStart = motion.indexOf("@media (prefers-reduced-motion: reduce)")
const normal = motion.slice(0, reducedStart)
const reduced = motion.slice(reducedStart)

function rule(css: string, selector: string): string {
  const text = `\n\n${css}`
  const start = text.indexOf(`\n\n${selector} {`)
  if (start < 0) throw new Error(`no rule ${selector}`)
  return text.slice(start, text.indexOf("}", start))
}

function token(css: string, name: string): string | undefined {
  return new RegExp(`${name}:\s*([^;]+);`).exec(css)?.[1]?.replace(/\s+/g, " ").trim()
}

describe("BrandMark motion", () => {
  it("paints the strokes only through the brand tokens defined in both themes", () => {
    expect(module).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(rule(module, ".accent")).toContain("var(--brand-ink)")
    expect(module).toContain("fill: var(--brand-accent)")
    for (const name of ["--brand-ink", "--brand-accent"])
      expect(semantic.match(new RegExp(`${name}:`, "g"))?.length, name).toBe(2)
  })

  it("aligns the accent with the base stroke while calm and drops it 7 modules otherwise", () => {
    expect(token(normal, "--shift-brand-align")).toBe("7px")
    expect(rule(module, ".accent")).toContain(
      "transform: translateY(calc(var(--shift-brand-align) * -1))",
    )
    expect(rule(module, ".identity .accent,\n.alarm .accent")).toContain("translateY(0)")
  })

  it("drops into alarm with the viscous curve over the long scene duration", () => {
    expect(rule(module, ".alarm .accent")).toContain("var(--transition-brand-drop)")
    expect(token(normal, "--transition-brand-drop")).toBe(
      "transform var(--dur-scene-long) var(--ease-viscous)",
    )
  })

  it("bobs while busy, alternating forever between aligned and dropped", () => {
    expect(rule(module, ".busy .accent")).toContain("var(--motion-brand-busy)")
    expect(token(normal, "--motion-brand-busy")).toMatch(/^kf-brand-busy .* infinite alternate$/)
    expect(keyframes).toContain("@keyframes kf-brand-busy")
  })

  it("reveals the base first, then lets the accent drop into place", () => {
    expect(rule(module, ".reveal .base")).toContain("var(--motion-brand-base-in)")
    expect(rule(module, ".reveal .enter")).toContain("var(--motion-brand-accent-in)")
    expect(rule(module, ".reveal .drop")).toContain("var(--motion-brand-drop-in)")
    expect(token(normal, "--delay-brand-accent")).toContain("var(--dur-scene)")
    expect(token(normal, "--delay-brand-drop")).toBe("var(--dur-scene)")
    expect(token(normal, "--motion-brand-drop-in")).toContain("var(--ease-viscous)")
  })

  it("collapses to a static dropped mark under reduced motion", () => {
    expect(token(reduced, "--shift-brand-align")).toBe("0px")
    expect(token(reduced, "--motion-brand-busy")).toBe("none")
    expect(token(reduced, "--dur-scene")).toBe("1ms")
    expect(token(reduced, "--dur-scene-long")).toBe("1ms")
  })
})
