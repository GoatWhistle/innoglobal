const modules = new URL('../../../../../frontend/node_modules/three/', import.meta.url)

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return nextResolve(new URL('build/three.module.js', modules).href, context)
  if (specifier.startsWith('three/addons/')) return nextResolve(new URL(`examples/jsm/${specifier.slice(13)}`, modules).href, context)
  return nextResolve(specifier, context)
}
