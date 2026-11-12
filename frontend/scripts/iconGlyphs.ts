import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseSprite, renderGlyphModule } from "./icons/sprite.ts"

const frontendRoot = resolve(fileURLToPath(new URL("..", import.meta.url)))
const iconDir = join(frontendRoot, "src", "shared", "ui", "primitives", "icon")
const localSprite = join(frontendRoot, "public", "icons.svg")
const target = join(iconDir, "glyphs.gen.ts")
const designSprite = resolve(frontendRoot, "..", "work", "design", "ds", "icons.svg")

function sourceSprite(args: readonly string[]): string | null {
  const flag = args.indexOf("--from")
  if (flag >= 0) {
    const given = args[flag + 1]
    if (given === undefined) throw new Error("icons: --from needs a path to an SVG sprite")
    return resolve(process.cwd(), given)
  }
  if (args.includes("--local")) return null
  return existsSync(designSprite) ? designSprite : null
}

const source = sourceSprite(process.argv.slice(2))
if (source !== null) {
  if (!existsSync(source)) throw new Error(`icons: ${source} does not exist`)
  copyFileSync(source, localSprite)
}
const table = parseSprite(readFileSync(localSprite, "utf8"))
writeFileSync(target, renderGlyphModule(table))
process.stdout.write(`icons: ${Object.keys(table).length} glyphs from ${source ?? localSprite}\n`)
