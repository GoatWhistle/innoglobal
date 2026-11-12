export type GlyphTag = "path" | "circle"

export interface GlyphNode {
  readonly tag: GlyphTag
  readonly attrs: Readonly<Record<string, string>>
}

export interface Glyph {
  readonly viewBox: string
  readonly nodes: readonly GlyphNode[]
}
