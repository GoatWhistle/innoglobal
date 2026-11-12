import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { parseSprite, SpriteError } from "../../scripts/icons/sprite.ts"
import { GLYPHS } from "../../src/shared/ui/primitives/icon/glyphs.gen.ts"

const SPRITE = join(process.cwd(), "public", "icons.svg")

describe("icon sprite", () => {
  it("keeps the generated glyphs in sync with the sprite, run npm run icons:sync", () => {
    expect(GLYPHS).toEqual(parseSprite(readFileSync(SPRITE, "utf8")))
  })

  it("reads paths and circles with their viewBox", () => {
    const table = parseSprite(
      '<svg><symbol id="dot" viewBox="0 0 24 24"><circle cx="1" cy="2" r="3"/><path d="M0 0h1"/></symbol></svg>',
    )
    expect(table.dot).toEqual({
      viewBox: "0 0 24 24",
      nodes: [
        { tag: "circle", attrs: { cx: "1", cy: "2", r: "3" } },
        { tag: "path", attrs: { d: "M0 0h1" } },
      ],
    })
  })

  it("rejects shapes and attributes the Icon cannot render", () => {
    expect(() => parseSprite('<symbol id="a"><rect x="1"/></symbol>')).toThrow(SpriteError)
    expect(() => parseSprite('<symbol id="a"><path d="M0" fill="red"/></symbol>')).toThrow(
      SpriteError,
    )
    expect(() =>
      parseSprite('<symbol id="a"><path d="M0"/></symbol><symbol id="a"><path d="M1"/></symbol>'),
    ).toThrow(SpriteError)
  })
})
