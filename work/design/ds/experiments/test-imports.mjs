import { registerHooks } from "node:module"

registerHooks({
  resolve(specifier, context, next) {
    return specifier === "three"
      ? next(new URL("../../../../frontend/node_modules/three/build/three.module.js", import.meta.url).href, context)
      : next(specifier, context)
  },
})
