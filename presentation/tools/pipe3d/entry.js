import * as THREE from "three"
import { createPipe } from "../../../frontend/src/features/material-pipe/engine/engine.js"
import { createWallEngine } from "../../../frontend/src/features/pipe-scene/engine/engine.js"

window.deckPipe3d = { THREE, createPipe, createWallEngine }
