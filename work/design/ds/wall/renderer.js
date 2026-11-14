import { createWallEngine } from './engine.js'

window.wallEngineFactory = createWallEngine
document.dispatchEvent(new CustomEvent('wall:renderer-ready', { detail: createWallEngine }))
