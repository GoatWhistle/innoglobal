import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  ICO_SIZES,
  MANIFEST,
  OG_SIZE,
  ogFile,
  RASTERS,
  REQUIRED_HEAD,
} from "../../scripts/brand/assets.ts"
import { icoSizes, pngSize } from "../../scripts/brand/binary.ts"
import {
  GEOMETRY_FILE,
  geometryModule,
  readGeometry,
  wordmarkSvg,
} from "../../scripts/brand/geometry.ts"
import { faviconSvg, readMark, readPalette } from "../../scripts/brand/marks.ts"
import { cardHtml } from "../../scripts/brand/pages.ts"
import { readTokenSources, themeColor } from "../../scripts/tokenSources.ts"

const ROOT = process.cwd()
const PUBLIC = join(ROOT, "public")
const FIX = "run npm run brand:assets"
const REPO = resolve(ROOT, "..")

interface Manifest {
  readonly name: string
  readonly icons: readonly {
    readonly src: string
    readonly sizes: string
    readonly purpose: string
  }[]
}

describe("brand assets in public/", () => {
  it(`favicon.svg matches the current mark and tokens (${FIX})`, () => {
    const expected = faviconSvg(readMark(resolve(ROOT, "..")), readPalette(ROOT))
    expect(readFileSync(join(PUBLIC, "favicon.svg"), "utf8")).toBe(expected)
    expect(expected).toContain("prefers-color-scheme:dark")
  })

  it("favicon.ico carries 16, 32 and 48 px", () => {
    expect(icoSizes(readFileSync(join(PUBLIC, "favicon.ico")))).toEqual([...ICO_SIZES])
  })

  it.each(RASTERS.map((asset) => [asset.file, asset.size] as const))(
    "%s is %i px square",
    (file, size) => {
      expect(pngSize(readFileSync(join(PUBLIC, file)))).toEqual({ width: size, height: size })
    },
  )

  it.each(["ru", "en"] as const)("the %s social card is 1200 x 630", (locale) => {
    expect(pngSize(readFileSync(join(PUBLIC, ogFile(locale))))).toEqual(OG_SIZE)
  })

  it("the manifest points to real icons with the declared sizes, maskable included", () => {
    const manifest = JSON.parse(readFileSync(join(PUBLIC, MANIFEST), "utf8")) as Manifest
    expect(manifest.name).not.toBe("")
    expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true)
    for (const icon of manifest.icons) {
      const file = join(PUBLIC, icon.src)
      expect(existsSync(file)).toBe(true)
      const size = pngSize(readFileSync(file))
      expect(`${size?.width}x${size?.height}`).toBe(icon.sizes)
    }
  })

  it("index.html links every icon, the manifest, the card and the title", () => {
    const html = readFileSync(join(ROOT, "index.html"), "utf8")
    for (const tag of REQUIRED_HEAD) expect(html).toContain(tag)
  })

  it(`the React mark is generated from docs/brand (${FIX})`, () => {
    const expected = geometryModule(readGeometry(REPO))
    expect(readFileSync(join(ROOT, GEOMETRY_FILE), "utf8")).toBe(expected)
  })

  it("paints the mark with the brand tokens: ink and oxblood by day, ink and amber at night", () => {
    const palette = readPalette(ROOT)
    const tokens = readTokenSources(ROOT)
    for (const theme of ["light", "dark"] as const) {
      expect(palette[theme].base).toBe(themeColor(tokens, theme, "--brand-ink"))
      expect(palette[theme].accent).toBe(themeColor(tokens, theme, "--brand-accent"))
    }
    expect(palette.light.accent).toBe("#a3271e")
    expect(palette.dark.accent).toBe("#ffac2e")
  })

  it("puts the outlined wordmark on the social card instead of the name set in the UI font", () => {
    const geometry = readGeometry(REPO)
    const palette = readPalette(ROOT).light
    const card = cardHtml(
      wordmarkSvg(geometry, palette, 112),
      { tagline: "T1", description: "D1", site: "" },
      palette,
      "",
      "sans-serif",
    )
    expect(card).toContain(geometry.word)
    expect(card).toContain(geometry.markAccent)
    expect(card).toContain(`fill="${palette.accent}"`)
    expect(card).toContain("T1")
    expect(card).not.toContain("border-top")
  })
})
