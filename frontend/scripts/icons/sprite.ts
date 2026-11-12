export const GLYPH_TAGS = ["path", "circle"] as const

export type GlyphTag = (typeof GLYPH_TAGS)[number]

export interface GlyphNode {
  readonly tag: GlyphTag
  readonly attrs: Readonly<Record<string, string>>
}

export interface Glyph {
  readonly viewBox: string
  readonly nodes: readonly GlyphNode[]
}

export type GlyphTable = Readonly<Record<string, Glyph>>

const SYMBOL = /<symbol\s+([^>]*)>([\s\S]*?)<\/symbol>/g
const ELEMENT = /<([a-z]+)\s+([^>]*?)\/>/g
const ATTRIBUTE = /([a-zA-Z-]+)="([^"]*)"/g
const NAME = /^[a-z][a-z0-9-]*$/
const ALLOWED_ATTRIBUTES: Readonly<Record<GlyphTag, ReadonlySet<string>>> = {
  path: new Set(["d"]),
  circle: new Set(["cx", "cy", "r"]),
}

export class SpriteError extends Error {
  constructor(message: string) {
    super(`icons: ${message}`)
    this.name = "SpriteError"
  }
}

function attributes(text: string): Record<string, string> {
  const found: Record<string, string> = {}
  for (const match of text.matchAll(ATTRIBUTE)) found[match[1] ?? ""] = match[2] ?? ""
  return found
}

function isGlyphTag(tag: string): tag is GlyphTag {
  return (GLYPH_TAGS as readonly string[]).includes(tag)
}

function node(id: string, tag: string, text: string): GlyphNode {
  if (!isGlyphTag(tag)) throw new SpriteError(`${id} uses <${tag}>, only path and circle`)
  const attrs = attributes(text)
  const extra = Object.keys(attrs).filter((name) => !ALLOWED_ATTRIBUTES[tag].has(name))
  if (extra.length > 0) throw new SpriteError(`${id} <${tag}> has ${extra.join(", ")}`)
  return { tag, attrs }
}

export function parseSprite(svg: string): GlyphTable {
  const table: Record<string, Glyph> = {}
  for (const symbol of svg.matchAll(SYMBOL)) {
    const head = attributes(symbol[1] ?? "")
    const id = head.id ?? ""
    if (!NAME.test(id)) throw new SpriteError(`symbol id "${id}" is not kebab-case`)
    if (table[id] !== undefined) throw new SpriteError(`${id} is declared twice`)
    const nodes = [...(symbol[2] ?? "").matchAll(ELEMENT)].map((match) =>
      node(id, match[1] ?? "", match[2] ?? ""),
    )
    if (nodes.length === 0) throw new SpriteError(`${id} has no shapes`)
    table[id] = { viewBox: head.viewBox ?? "0 0 24 24", nodes }
  }
  if (Object.keys(table).length === 0) throw new SpriteError("sprite has no symbols")
  return table
}

export function renderGlyphModule(table: GlyphTable): string {
  const entries = Object.entries(table).map(
    ([name, glyph]) => `  ${JSON.stringify(name)}: ${JSON.stringify(glyph)},`,
  )
  return [
    'import type { Glyph } from "./glyph"',
    "",
    "export const GLYPHS = {",
    ...entries,
    "} as const satisfies Readonly<Record<string, Glyph>>",
    "",
    "export type IconName = keyof typeof GLYPHS",
    "",
  ].join("\n")
}
