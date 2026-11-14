import { createScannerEngine } from './engine.js'

window.scannerEngineFactory=createScannerEngine
document.dispatchEvent(new CustomEvent('scanner:renderer-ready',{detail:createScannerEngine}))
