import path from "node:path"
import { fileURLToPath } from "node:url"
import { build } from "esbuild"

const here = path.dirname(fileURLToPath(import.meta.url))
const frontend = path.resolve(here, "../../frontend/src")
const deckRoot = path.resolve(here, "..")

await build({
  entryPoints: [path.join(here, "pipe3d", "entry.js")],
  outfile: path.resolve(here, "../src/core/js/pipe3d.js"),
  bundle: true,
  format: "iife",
  minify: true,
  target: "es2022",
  legalComments: "none",
  logLevel: "warning",
  plugins: [
    {
      name: "deck-resolve",
      setup(b) {
        b.onResolve({ filter: /^@\/entities\/pipe$/ }, () => ({
          path: path.join(frontend, "entities/pipe/wall-illustration.ts"),
        }))
        b.onResolve({ filter: /^three(\/.*)?$/ }, (args) =>
          args.pluginData === "deck"
            ? undefined
            : b.resolve(args.path, { kind: args.kind, resolveDir: deckRoot, pluginData: "deck" }),
        )
      },
    },
  ],
})
console.log("pipe3d bundle written")
