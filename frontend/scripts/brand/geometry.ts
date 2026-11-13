import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { ThemePalette } from "./marks.ts"

export interface BrandGeometry {
  readonly markViewBox: string
  readonly markBase: string
  readonly markAccent: string
  readonly wordmarkViewBox: string
  readonly word: string
  readonly markTransform: string
}

export const GEOMETRY_FILE = "src/shared/ui/brand/brand-mark/brand-geometry.gen.ts"

const LINE_WIDTH = 100

function pick(svg: string, pattern: RegExp, what: string): string {
  const value = pattern.exec(svg)?.[1]
  if (value === undefined) throw new Error(`brand geometry: ${what} not found in docs/brand`)
  return value
}

export function readGeometry(repoRoot: string): BrandGeometry {
  const brand = join(repoRoot, "docs", "brand")
  const symbol = readFileSync(join(brand, "symbol.svg"), "utf8")
  const wordmark = readFileSync(join(brand, "wordmark-light.svg"), "utf8")
  return {
    markViewBox: pick(symbol, /<svg\b[^>]*\bviewBox="([^"]+)"/, "symbol viewBox"),
    markBase: pick(symbol, /class="mark-base"[^>]*\bd="([^"]+)"/, "mark-base"),
    markAccent: pick(symbol, /class="mark-accent"[^>]*\bd="([^"]+)"/, "mark-accent"),
    wordmarkViewBox: pick(wordmark, /<svg\b[^>]*\bviewBox="([^"]+)"/, "wordmark viewBox"),
    word: pick(wordmark, /<path(?![^>]*\bclass=)[^>]*\bd="([^"]+)"/, "wordmark letters"),
    markTransform: pick(wordmark, /<g\b[^>]*\btransform="([^"]+)"/, "wordmark mark transform"),
  }
}

function constant(name: string, value: string): string {
  const line = `export const ${name} = ${JSON.stringify(value)}`
  return line.length <= LINE_WIDTH ? line : `export const ${name} =\n  ${JSON.stringify(value)}`
}

export function geometryModule(geometry: BrandGeometry): string {
  const lines = [
    constant("MARK_VIEW_BOX", geometry.markViewBox),
    constant("MARK_BASE_PATH", geometry.markBase),
    constant("MARK_ACCENT_PATH", geometry.markAccent),
    constant("WORDMARK_VIEW_BOX", geometry.wordmarkViewBox),
    constant("WORDMARK_WORD_PATH", geometry.word),
    constant("WORDMARK_MARK_TRANSFORM", geometry.markTransform),
  ]
  return `${lines.join("\n")}\n`
}

export function wordmarkSvg(geometry: BrandGeometry, colors: ThemePalette, height: number): string {
  const mark = `<g transform="${geometry.markTransform}"><path fill="${colors.base}" d="${geometry.markBase}"/><path fill="${colors.accent}" d="${geometry.markAccent}"/></g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${geometry.wordmarkViewBox}" height="${height}" style="display:block;width:auto"><path fill="${colors.base}" d="${geometry.word}"/>${mark}</svg>`
}
